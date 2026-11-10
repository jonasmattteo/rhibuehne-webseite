# Rhibühne Eglisau – Webseite

Neue Webseite der Rhibühne Eglisau, gebaut mit [Astro](https://astro.build), gehostet auf **GitHub Pages**, Inhalte pflegbar über ein **Admin-Backend** ([Sveltia CMS](https://github.com/sveltia/sveltia-cms)) unter `/admin`.

## Überblick

| Bereich | Wo | Bearbeiten im Admin unter |
| --- | --- | --- |
| Startseite (Saison-Text, Hinweise) | `src/content/einstellungen/startseite.json` | Einstellungen → Startseite |
| Theaterstücke / Archiv | `src/content/stuecke/*.md` | Theaterstücke |
| Vereinsanlässe | `src/content/anlaesse/*.md` | Vereinsanlässe |
| Seiten (Tickets, Über uns, Kontakt …) | `src/content/seiten/*.md` | Seiten |
| Vorstand, Sponsoren, Links, Kontakt | `src/content/einstellungen/*.json` | Einstellungen |
| Mitgliederbereich 🔒 | `src/content/mitglieder/*.md` | Mitgliederbereich |
| Bilder | `src/assets/uploads/` (werden automatisch optimiert) | Medien |

Jede Änderung im Admin wird als Commit ins GitHub-Repository gespeichert. GitHub Actions baut die Seite danach automatisch neu, und nach ca. 1–2 Minuten ist sie online.

## Einrichtung auf GitHub (einmalig)

1. **Repository anlegen** und den Code pushen (Branch `main`).
2. In `public/admin/config.yml` bei `backend.repo` den Repository-Namen eintragen (z. B. `rhibuehne/webseite`).
3. **Mitglieder-Passwort** hinterlegen: *Settings → Secrets and variables → Actions → New repository secret*
   - Name: `MITGLIEDER_PASSWORT`
   - Wert: das gewünschte Passwort (bitte lang wählen, z. B. 4–5 Wörter)
4. **GitHub Pages aktivieren**: *Settings → Pages → Source: „GitHub Actions“*.
5. **Eigene Domain** (rhibuehne.ch): *Settings → Pages → Custom domain* → `rhibuehne.ch` eintragen, beim Domain-Anbieter die DNS-Einträge gemäss [GitHub-Anleitung](https://docs.github.com/de/pages/configuring-a-custom-domain-for-your-github-pages-site) setzen (A-Records auf die GitHub-IPs bzw. CNAME für `www`) und „Enforce HTTPS“ aktivieren.

Ohne eigene Domain läuft die Seite unter `https://<name>.github.io/<repository>/`. Der Basis-Pfad wird automatisch erkannt.

## Admin-Backend (`/admin`)

Das Backend ist durch die **GitHub-Anmeldung geschützt**: Nur Personen mit Schreibrechten auf das Repository können Inhalte ändern. Neue Redaktoren lädt man unter *Settings → Collaborators* ins Repository ein.

**Anmelden mit Zugriffstoken (ohne zusätzliche Einrichtung):**
1. Auf GitHub: *Profil → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*
2. Repository: nur dieses Repository; Berechtigung *Contents: Read and write*
3. Unter `https://rhibuehne.ch/admin/` → „Mit Zugriffstoken anmelden“ → Token einfügen.

**Optional: „Mit GitHub anmelden“-Button:** Dafür braucht es einen kleinen OAuth-Helfer, z. B. den kostenlosen [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) auf Cloudflare Workers. Dessen URL dann in `config.yml` als `base_url` eintragen.

**Lokal arbeiten:** `npm run dev`, dann `http://localhost:4321/admin/index.html` in Chrome oder Edge öffnen → „Mit lokalem Repository arbeiten“ → diesen Ordner wählen. Änderungen werden direkt in die Dateien geschrieben.

## Mitgliederbereich

GitHub Pages kann nur statische Dateien ausliefern, es gibt also keinen Server, der ein Passwort prüfen könnte. Deshalb werden die Inhalte des Mitgliederbereichs **beim Build mit dem Passwort verschlüsselt** (AES-256-GCM, Schlüssel per PBKDF2 mit 600 000 Iterationen abgeleitet). Im Browser werden sie erst nach Eingabe des richtigen Passworts entschlüsselt. Ohne das Passwort ist der Inhalt im HTML nicht lesbar.

Zu beachten:
- **Passwort ändern:** Secret `MITGLIEDER_PASSWORT` anpassen und unter *Actions → Webseite veröffentlichen → Run workflow* neu bauen.
- **Dateien/PDFs** im Mitgliederbereich liegen unter `/uploads/mitglieder/` und werden nicht verschlüsselt. Wer den genauen Link kennt, kann sie öffnen.
- Ist das GitHub-Repository **öffentlich**, sind die Mitglieder-Texte im Quellcode (`src/content/mitglieder/`) einsehbar. Für vertrauliche Inhalte das Repository **privat** stellen. GitHub Pages aus privaten Repositories erfordert einen kostenpflichtigen Plan (GitHub Pro oder Team; für gemeinnützige Vereine gibt es Vergünstigungen).

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:4321 (Mitglieder-Testpasswort lokal: theater)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

`npm run migrate` holt die Inhalte erneut von der alten WordPress-Seite (nur für die einmalige Migration gedacht; überschreibt Dateien in `src/content/`).

## Struktur

```
src/
  assets/uploads/     Bilder (aus WordPress übernommen + neue Uploads)
  components/         Header, Footer, Galerie (mit Lightbox), Karten
  content/            Alle Inhalte (Markdown/JSON) – siehe Tabelle oben
  content.config.ts   Schema der Inhalte
  layouts/            Grundlayout
  pages/              Routen
public/admin/         Admin-Backend (index.html + config.yml)
.github/workflows/    Automatisches Deployment auf GitHub Pages
```
