import type { APIRoute } from 'astro';
import { SITE_PAGES, urlFor } from '../site-pages';

// Hand-rolled rather than @astrojs/sitemap so the sitemap and the head tags read from the
// same manifest. No <priority> or <changefreq>: Google ignores both. <lastmod> is the one
// hint it acts on, and only while it stays truthful.
export const GET: APIRoute = () => {
  const urls = SITE_PAGES.map(
    ({ slug, lastmod }) =>
      `  <url>\n    <loc>${urlFor(slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
};
