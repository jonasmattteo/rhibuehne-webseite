import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Alle Inhalte liegen als Markdown/JSON in src/content/ und werden über das
 * Admin-Backend (/admin) bearbeitet. Bilder liegen in src/assets/uploads/.
 */

const stuecke = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stuecke' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      jahr: z.number().int(),
      zeitraum: z.string().optional(),
      untertitel: z.string().optional(),
      bild: image().optional(),
      galerie: z.array(image()).default([]),
      entwurf: z.boolean().default(false),
    }),
});

const anlaesse = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/anlaesse' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      datum: z.coerce.date(),
      bild: image().optional(),
      galerie: z.array(image()).default([]),
      entwurf: z.boolean().default(false),
    }),
});

const seiten = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seiten' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      bereich: z.enum(['theater', 'verein', 'infos', 'kontakt']).default('verein'),
      beschreibung: z.string().optional(),
      bild: image().optional(),
      eventfrog: z.string().url().optional(),
      galerie: z.array(image()).default([]),
    }),
});

/** Mitgliederbereich – wird beim Build verschlüsselt (siehe src/pages/mitglieder.astro) */
const mitglieder = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/mitglieder' }),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date().optional(),
    reihenfolge: z.number().default(0),
  }),
});

const startseite = defineCollection({
  loader: glob({ pattern: 'startseite.json', base: './src/content/einstellungen' }),
  schema: ({ image }) =>
    z.object({
      aktuell: z.object({ titel: z.string(), text: z.string().default('') }),
      hinweise: z
        .array(
          z.object({
            titel: z.string(),
            text: z.string().optional().default(''),
            bild: image().optional(),
            link: z.string().optional(),
          }),
        )
        .default([]),
      anzahlStuecke: z.number().default(5),
    }),
});

const vorstand = defineCollection({
  loader: glob({ pattern: 'vorstand.json', base: './src/content/einstellungen' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      mitglieder: z.array(
        z.object({
          funktion: z.string(),
          name: z.string(),
          email: z.string().optional(),
          foto: image().optional(),
        }),
      ),
    }),
});

const sponsoren = defineCollection({
  loader: glob({ pattern: 'sponsoren.json', base: './src/content/einstellungen' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      text: z.string().optional(),
      sponsoren: z.array(
        z.object({
          name: z.string().optional().default(''),
          logo: image(),
          url: z.string().optional(),
        }),
      ),
    }),
});

const links = defineCollection({
  loader: glob({ pattern: 'links.json', base: './src/content/einstellungen' }),
  schema: z.object({
    titel: z.string(),
    gruppen: z.array(
      z.object({
        titel: z.string(),
        links: z.array(z.object({ name: z.string(), url: z.string() })),
      }),
    ),
  }),
});

const allgemein = defineCollection({
  loader: glob({ pattern: 'allgemein.json', base: './src/content/einstellungen' }),
  schema: z.object({
    vereinsname: z.string(),
    slogan: z.string().optional(),
    email: z.string(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    theaterAdresse: z.string(),
    postAdresse: z.string(),
    kartenLink: z.string().optional(),
  }),
});

export const collections = { stuecke, anlaesse, seiten, mitglieder, startseite, vorstand, sponsoren, links, allgemein };
