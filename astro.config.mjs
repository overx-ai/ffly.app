import { defineConfig, passthroughImageService } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import { rehypeScrollTables, remarkDropTitle } from './src/markdown-plugins.mjs';

// No integrations. @astrojs/sitemap crashes at build time against astro@4.16, and
// src/pages/sitemap.xml.ts generates the same file from src/site-pages.ts, which also
// drives the canonical tag. One manifest, so the two cannot drift.
// Hybrid (spec 014): every page stays prerendered; only src/pages/api/auth/* opt out and run as one Vercel function.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://ffly.app',
  output: 'hybrid',
  adapter: vercel(),
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'always',
  },
  image: { service: passthroughImageService(), endpoint: './src/server/no-image.ts' },
  // Astro inlines a hoisted script under this size, and the CSP blocks inline scripts.
  vite: {
    build: { assetsInlineLimit: 0 },
  },
  markdown: {
    remarkPlugins: [remarkDropTitle],
    rehypePlugins: [rehypeScrollTables],
  },
});
