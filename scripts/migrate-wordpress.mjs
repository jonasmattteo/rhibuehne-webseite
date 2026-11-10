#!/usr/bin/env node
/**
 * Einmaliges Migrationsskript: holt Beiträge, Seiten und Bilder von der
 * bisherigen WordPress-Seite (rhibuehne.ch) und legt sie als Markdown/JSON
 * in src/content/ bzw. Bilder in src/assets/uploads/ ab.
 *
 *   node scripts/migrate-wordpress.mjs
 *
 * Bereits vorhandene Bilder werden nicht erneut heruntergeladen.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import * as yaml from 'js-yaml';

const WP = 'https://rhibuehne.ch';
const ROOT = path.resolve(import.meta.dirname, '..');
const UPLOADS = path.join(ROOT, 'src/assets/uploads');
const CONTENT = path.join(ROOT, 'src/content');
const REL = '../../assets/uploads'; // relativer Pfad aus src/content/<sammlung>/

const exists = (p) => access(p).then(() => true, () => false);

async function wpGet(type, params = '') {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP}/wp-json/wp/v2/${type}?per_page=100&page=${page}${params}`);
    if (!res.ok) break;
    const data = await res.json();
    out.push(...data);
    if (page >= Number(res.headers.get('x-wp-totalpages') || 1)) break;
  }
  return out;
}

const decode = (s) => cheerio.load(`<p>${s}</p>`)('p').text().trim();

/** Bild-URL auf Original zurückführen und herunterladen. Gibt relativen Pfad zurück. */
const downloaded = new Map();
async function fetchImage(url) {
  if (!url) return null;
  url = url.split('?')[0].replace(/^http:/, 'https:');
  // Grössen-Suffix (-300x200) entfernen → Originaldatei
  const orig = url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  if (downloaded.has(orig)) return downloaded.get(orig);
  const m = orig.match(/wp-content\/uploads\/(.+)$/);
  if (!m) return null;
  const relFile = decodeURIComponent(m[1])
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Umlaute → ASCII
    .replace(/[^a-zA-Z0-9/._-]+/g, '-');
  const target = path.join(UPLOADS, relFile);
  const result = `${REL}/${relFile}`;
  if (!(await exists(target))) {
    let res = await fetch(orig);
    if (!res.ok && orig !== url) res = await fetch(url);
    if (!res.ok) { console.warn('  ⚠ Bild nicht gefunden', url); downloaded.set(orig, null); return null; }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    process.stdout.write('.');
  }
  downloaded.set(orig, result);
  return result;
}

const imgSrc = ($img) => $img.attr('data-orig-file') || $img.attr('data-full-url') || $img.attr('src');

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
td.use(gfm);
/** Tabelle → GFM-Markdown (erste Zeile als Kopfzeile, da WP meist kein <th> nutzt) */
function tableToMd($, table) {
  const rows = $(table).find('tr').toArray().map((tr) =>
    $(tr).find('td,th').toArray().map((c) =>
      td.turndown($(c).html() || '').replace(/\n+/g, ' ').replace(/\|/g, '\\|').replace(/\u200b/g, '').trim(),
    ),
  );
  if (!rows.length) return '';
  const cols = Math.max(...rows.map((r) => r.length));
  const line = (r) => `| ${Array.from({ length: cols }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return `${line(rows[0])}\n| ${Array(cols).fill('---').join(' | ')} |\n${rows.slice(1).map(line).join('\n')}`;
}

/** WordPress-HTML → { body (Markdown), galerie: [] } */
async function convert(html, { collectAllImages = false } = {}) {
  const $ = cheerio.load(html, null, false);
  $('style, script, .sharedaddy, .jp-relatedposts, .wp-show-posts, .display-posts-listing').remove();
  const galerie = [];
  for (const el of $('figure.wp-block-gallery, .gallery, .tiled-gallery').toArray()) {
    for (const img of $(el).find('img').toArray()) {
      const p = await fetchImage(imgSrc($(img)));
      if (p) galerie.push(p);
    }
    $(el).remove();
  }
  for (const img of $('img').toArray()) {
    const $img = $(img);
    const p = await fetchImage(imgSrc($img));
    if (collectAllImages && p) { galerie.push(p); $img.closest('figure').length ? $img.closest('figure').remove() : $img.remove(); continue; }
    if (p) { $img.attr('src', p); $img.removeAttr('srcset'); }
    else $img.remove();
    // Link um Bild auf Anhang-Seite entfernen
    const a = $img.parent('a');
    if (a.length) a.replaceWith($img);
  }
  // Überschriften eine Stufe tiefer (H1 ist der Seitentitel)
  $('h1').each((_, h) => { h.tagName = 'h2'; });
  $('iframe').remove();
  const tables = [];
  $('table').each((i, t) => { tables.push(tableToMd($, t)); $(t).replaceWith(`<p>%%TABLE${i}%%</p>`); });
  let body = td.turndown($.html())
    .replace(/%%TABLE(\d+)%%/g, (_, i) => tables[Number(i)])
    .replace(/​| /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { body, galerie };
}

function frontmatter(data, body = '') {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
  return `---\n${yaml.dump(clean, { lineWidth: -1 })}---\n\n${body}\n`;
}

const slugify = (s) => s.normalize('NFC').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  console.log('Lade WordPress-Daten …');
  const [posts, pages, media] = await Promise.all([wpGet('posts'), wpGet('pages'), wpGet('media')]);
  const mediaById = new Map(media.map((m) => [m.id, m.source_url]));
  for (const dir of ['stuecke', 'anlaesse', 'seiten', 'einstellungen', 'mitglieder']) {
    await mkdir(path.join(CONTENT, dir), { recursive: true });
  }

  // ---------- Beiträge ----------
  for (const p of posts) {
    const title = decode(p.title.rendered);
    const cats = p.categories;
    if (cats.includes(9)) continue; // „Startseite“-Beitrag → startseite.json
    const { body, galerie } = await convert(p.content.rendered);
    const bild = await fetchImage(mediaById.get(p.featured_media));
    if (cats.includes(5)) {
      const m = title.match(/^(\d{4})(?:\s*[–-]\s*\d{4})?\s*:?\s*(.*)$/);
      const jahr = m ? Number(m[1]) : new Date(p.date).getFullYear();
      const titel = m && m[2] ? m[2].trim() : title;
      const slug = title.startsWith('2001') ? '2001-2004' : `${jahr}-${slugify(titel)}`;
      await writeFile(path.join(CONTENT, 'stuecke', `${slug}.md`),
        frontmatter({ titel, jahr, ...(title.startsWith('2001') ? { zeitraum: '2001 – 2004', titel: 'Stücke 2001 – 2004' } : {}), bild, galerie }, body));
    } else {
      const datum = p.date.slice(0, 10);
      const slug = /\d{4}/.test(title) ? slugify(title) : `${datum.slice(0, 4)}-${slugify(title)}`;
      await writeFile(path.join(CONTENT, 'anlaesse', `${slug}.md`),
        frontmatter({ titel: title.replace(/_/g, ' '), datum, bild, galerie }, body));
    }
    console.log(`\n✓ ${title}`);
  }

  // ---------- Seiten ----------
  const page = (slug) => pages.find((x) => x.slug === slug);
  const simplePages = {
    'ueber-uns': { slug: 'ueber-uns', titel: 'Über uns', bereich: 'verein' },
    'mitglied-werden': { slug: 'mitglied-werden', titel: 'Mitglied werden', bereich: 'verein' },
    'tribuehne-saal': { slug: 'tribuehne-saal', titel: 'Tribühne / Saal', bereich: 'theater' },
    archiv: { slug: 'kontakt', titel: 'Kontakt / Anfahrt', bereich: 'kontakt' },
    'tickets-reservation': { slug: 'tickets', titel: 'Tickets / Reservation', bereich: 'theater' },
  };
  for (const [wpSlug, meta] of Object.entries(simplePages)) {
    const p = page(wpSlug);
    let { body, galerie } = await convert(p.content.rendered);
    body = body.replace(new RegExp(`^##\\s+${meta.titel.replace(/[/]/g, '\\/')}\\s*\\n+`, 'i'), '');
    const extra = {};
    if (wpSlug === 'tickets-reservation') {
      const src = cheerio.load(p.content.rendered)('iframe').attr('src');
      if (src) extra.eventfrog = src.replace(/&#038;/g, '&');
    }
    await writeFile(path.join(CONTENT, 'seiten', `${meta.slug}.md`),
      frontmatter({ titel: meta.titel, bereich: meta.bereich, ...extra, galerie }, body));
    console.log(`\n✓ Seite ${meta.titel}`);
  }

  // Vorstand
  {
    const $ = cheerio.load(page('vorstand').content.rendered);
    const mitglieder = [];
    for (const c of $('.vorstand-container').toArray()) {
      if (!$(c).find('.vorstand-text').length) continue;
      const foto = await fetchImage(imgSrc($(c).find('img').first()));
      const t = $(c).find('.vorstand-text');
      const funktion = t.find('strong').text().replace(/:$/, '').trim();
      const email = t.find('a[href^="mailto:"]').text().trim();
      const lines = (t.html() || '').split(/<br\s*\/?>/i).map((l) => cheerio.load(l).text().trim()).filter(Boolean);
      const name = lines.find((l) => !l.endsWith(':') && !l.includes('@')) || '';
      mitglieder.push({ funktion, name, email, foto });
    }
    await writeFile(path.join(CONTENT, 'einstellungen', 'vorstand.json'), JSON.stringify({ titel: 'Unser Vorstand', mitglieder }, null, 2));
    console.log('\n✓ Vorstand', mitglieder.length);
  }

  // Sponsoren
  {
    const $ = cheerio.load(page('sponsoren-goenner').content.rendered);
    const sponsoren = [];
    for (const img of $('img').toArray()) {
      const $img = $(img);
      const logo = await fetchImage(imgSrc($img));
      let name = decode($img.attr('data-image-title') || '').replace(/_/g, ' ').replace(/\s+v zuschnitt$/i, '');
      if (/^(images|screenshot|img|download|unbenannt|logo)/i.test(name)) name = '';
      const link = $img.closest('a').attr('href');
      sponsoren.push({ name, logo, ...(link && !link.includes('rhibuehne.ch') ? { url: link } : {}) });
    }
    await writeFile(path.join(CONTENT, 'einstellungen', 'sponsoren.json'),
      JSON.stringify({ titel: 'Unsere Gönner und Sponsoren in dieser Saison', sponsoren }, null, 2));
    console.log('\n✓ Sponsoren', sponsoren.length);
  }

  // Links
  {
    const $ = cheerio.load(page('links').content.rendered);
    const gruppen = $('.wp-block-column').toArray().map((col) => ({
      titel: $(col).find('h2').text().trim(),
      links: $(col).find('a').toArray().map((a) => ({ name: $(a).text().trim(), url: $(a).attr('href') })),
    }));
    await writeFile(path.join(CONTENT, 'einstellungen', 'links.json'), JSON.stringify({ titel: 'Links', gruppen }, null, 2));
  }

  // Startseite
  {
    const sp = posts.find((x) => x.categories.includes(9));
    const $ = cheerio.load(sp.content.rendered);
    const h = $('h1').toArray();
    const aktuellTitel = $(h[0]).text().trim();
    const aktuellText = $(h[0]).nextUntil('h1').filter('p').toArray().map((p) => $(p).text().trim()).join('\n\n');
    const hinweisTitel = $(h[1]).text().trim();
    const hinweisBild = await fetchImage(imgSrc($(h[1]).nextAll('figure').find('img').first()));
    await writeFile(path.join(CONTENT, 'einstellungen', 'startseite.json'), JSON.stringify({
      aktuell: { titel: aktuellTitel, text: aktuellText },
      hinweise: [{ titel: hinweisTitel, text: '', bild: hinweisBild }],
      anzahlStuecke: 5,
    }, null, 2));
  }

  console.log('\nFertig.');
}

main().catch((e) => { console.error(e); process.exit(1); });
