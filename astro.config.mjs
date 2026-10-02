import { defineConfig } from 'astro/config';

// No integrations. @astrojs/sitemap crashes at build time against astro@4.16, and
// src/pages/sitemap.xml.ts generates the same file from src/site-pages.ts, which also
// drives the canonical tag. One manifest, so the two cannot drift.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://ffly.app',
  output: 'static',
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'always',
  },
});
