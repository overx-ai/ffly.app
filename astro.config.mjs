import { defineConfig } from 'astro/config';
import { rehypeScrollTables, remarkDropTitle } from './src/markdown-plugins.mjs';

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
  // Astro inlines a hoisted script under this size, and the CSP blocks inline scripts.
  vite: {
    build: { assetsInlineLimit: 0 },
  },
  markdown: {
    remarkPlugins: [remarkDropTitle],
    rehypePlugins: [rehypeScrollTables],
  },
});
