import type { APIRoute } from 'astro';
import { LANGS } from '../i18n/locales';
import { SITE_PAGES, alternates, isLocalized, urlFor } from '../site-pages';

// Hand-rolled rather than @astrojs/sitemap so the sitemap and the head tags read from the
// same manifest. No <priority> or <changefreq>: Google ignores both. <lastmod> is the one
// hint it acts on, and only while it stays truthful.
export const GET: APIRoute = () => {
  const urls = SITE_PAGES.flatMap(({ slug, lastmod }) => {
    const links = alternates(slug)
      .map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
      .join('');
    const langs = isLocalized(slug) ? LANGS.map((l) => l.code) : [undefined];
    return langs.map(
      (lang) => `  <url>\n    <loc>${urlFor(slug, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>${links}\n  </url>`,
    );
  }).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
};
