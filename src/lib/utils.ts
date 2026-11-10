import { getCollection, getEntry } from 'astro:content';

/** Pfad mit Basis-URL versehen (wichtig für GitHub Pages ohne eigene Domain). */
export function url(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const formatDatum = (d: Date) =>
  d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

const sichtbar = <T extends { data: { entwurf?: boolean } }>(e: T) => import.meta.env.DEV || !e.data.entwurf;

export async function getStuecke() {
  const list = (await getCollection('stuecke')).filter(sichtbar);
  return list.sort((a, b) => b.data.jahr - a.data.jahr || a.data.titel.localeCompare(b.data.titel));
}

export async function getAnlaesse() {
  const list = (await getCollection('anlaesse')).filter(sichtbar);
  return list.sort((a, b) => b.data.datum.getTime() - a.data.datum.getTime());
}

export async function getEinstellung<C extends 'startseite' | 'vorstand' | 'sponsoren' | 'links' | 'allgemein'>(c: C) {
  const [entry] = await getCollection(c);
  if (!entry) throw new Error(`Einstellung ${c} fehlt in src/content/einstellungen/`);
  return entry.data;
}

/** Kurzer Teaser aus Markdown */
export function teaser(md = '', len = 180) {
  const txt = md
    .replace(/^\|.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return txt.length > len ? `${txt.slice(0, len).replace(/\s\S*$/, '')} …` : txt;
}

export { getEntry };
