/**
 * Verschlüsselung für den Mitgliederbereich (läuft beim Build in Node).
 * AES-256-GCM, Schlüssel per PBKDF2-SHA256 aus dem Passwort abgeleitet.
 * Entschlüsselt wird im Browser mit der Web Crypto API (siehe mitglieder.astro).
 * Ohne Passwort ist der Inhalt im ausgelieferten HTML nicht lesbar.
 */
export const ITERATIONS = 600_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64');

export async function encrypt(plaintext: string, password: string) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { v: 1, it: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(cipher) };
}

export function getMitgliederPasswort() {
  const pw = process.env.MITGLIEDER_PASSWORT;
  if (pw) return pw;
  if (process.env.CI) {
    throw new Error(
      'MITGLIEDER_PASSWORT ist nicht gesetzt. Bitte im GitHub-Repository unter Settings → Secrets and variables → Actions anlegen.',
    );
  }
  console.warn('[mitglieder] MITGLIEDER_PASSWORT nicht gesetzt – lokales Test-Passwort "theater" wird verwendet.');
  return 'theater';
}
