// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE / BASE werden im GitHub-Actions-Workflow gesetzt.
// - Eigene Domain (rhibuehne.ch):      SITE=https://rhibuehne.ch  BASE=/
// - Ohne Domain (user.github.io/repo): SITE=https://user.github.io BASE=/repo
const site = process.env.SITE || 'https://rhibuehne.ch';
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/mitglieder') && !page.includes('/admin') })],
  image: {
    responsiveStyles: true,
  },
});
