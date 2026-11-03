import { DEFAULT_LANG, LANGS, X_DEFAULT, localeOf, type Lang } from './i18n/locales';

// Single source of truth for every indexable route.
// Three consumers read it: BaseLayout (canonical, via urlFor), sitemap.xml.ts (<lastmod>) and
// each page's "Last updated" line (via lastUpdated), so they cannot drift. An unregistered page
// is invisible to crawlers.
//
// `lastmod` is a claim made to search engines and readers, not a build artefact. Bump a date only
// when that page's copy actually changed. Never wire it to the build clock.
//
// One lastmod per slug, shared by every language of a localized page.
//
// A guide written in another language (spec 018) is its own page under that language's prefix,
// e.g. { slug: 'de/guides/{slug}', lastmod }: self-canonical, with no alternates.
//
// /, /support, /privacy and /terms are fixed: the iOS app (LegalLinks.swift) and the App Store
// listing (fastlane/metadata/*/{marketing,support,privacy}_url.txt) point at them.
export const SITE_PAGES = [
  { slug: '',        lastmod: '2026-10-16' },
  { slug: 'support', lastmod: '2026-10-16' },
  { slug: 'privacy', lastmod: '2026-10-16' },
  { slug: 'terms',   lastmod: '2026-10-15' },
  { slug: 'search',  lastmod: '2026-10-16' },
  { slug: 'guides',  lastmod: '2026-10-05' },
  { slug: 'guides/cheapest-order-to-visit-cities', lastmod: '2026-10-16' },
  { slug: 'guides/multi-city-vs-one-way-tickets',  lastmod: '2026-10-16' },
  { slug: 'guides/open-jaw-flights-europe',        lastmod: '2026-10-16' },
  { slug: 'de/guides/guenstigste-reihenfolge-staedte', lastmod: '2026-10-24' },
  { slug: 'de/guides/gabelflug-europa-billigflieger', lastmod: '2026-10-26' },
  { slug: 'fr/guides/ordre-visiter-plusieurs-villes-moins-cher', lastmod: '2026-10-24' },
  { slug: 'es/guides/orden-visitar-varias-ciudades-mas-barato', lastmod: '2026-11-02' },
  { slug: 'es/guides/vuelos-multidestino-baratos-europa', lastmod: '2026-11-02' },
  { slug: 'it/guides/voli-multitratta-low-cost', lastmod: '2026-11-03' },
  { slug: 'pt/guides/viajar-varias-cidades-europa-aviao', lastmod: '2026-11-03' },
  { slug: 'pl/guides/jak-zaplanowac-podroz-po-kilku-miastach-europy', lastmod: '2026-11-03' },
  { slug: 'nl/guides/volgorde-steden-bezoeken-goedkoopst', lastmod: '2026-11-03' },
  { slug: 'ru/guides/kak-sostavit-marshrut-po-evrope', lastmod: '2026-11-03' },
  { slug: 'sv/guides/flyga-mellan-flera-stader-europa', lastmod: '2026-11-03' },
  { slug: 'da/guides/flyve-mellem-flere-byer-europa', lastmod: '2026-11-03' },
] as const;

export type Slug = (typeof SITE_PAGES)[number]['slug'];

// The build's `site` (astro.config.mjs, PUBLIC_SITE_URL), with no trailing slash.
export const siteOrigin = import.meta.env.SITE.replace(/\/$/, '');

export const isSlug = (slug: string): slug is Slug => SITE_PAGES.some((page) => page.slug === slug);

export const DEFAULT_OG_IMAGE = '/og-image.jpg';

// Only these have a page per language (/de, /de/search, /de/guides). Every other page is English-only at the root.
export const LOCALIZED_SLUGS = ['', 'search', 'guides'] as const satisfies readonly Slug[];

export const isLocalized = (slug: Slug) => (LOCALIZED_SLUGS as readonly Slug[]).includes(slug);

export const GUIDES_INDEX = 'guides' satisfies Slug;

export const isGuidePage = (slug: Slug) => slug.split('/').includes(GUIDES_INDEX);

export function pathFor(slug: Slug, lang: Lang = DEFAULT_LANG): string {
  const prefix = isLocalized(slug) ? localeOf(lang).prefix : '';
  return `/${[prefix, slug].filter(Boolean).join('/')}`;
}

// A language has guides once one is registered above under its prefix. Until then its guides hub (which lists the
// English ones) stays out of search: noindex, no hreflang, not in the sitemap.
export const hasGuides = (lang: Lang) => SITE_PAGES.some((page) => page.slug.startsWith(`${pathFor(GUIDES_INDEX, lang).slice(1)}/`));

export const isIndexed = (slug: Slug, lang: Lang = DEFAULT_LANG) => slug !== GUIDES_INDEX || hasGuides(lang);

export const indexedLangs = (slug: Slug) => LANGS.filter((l) => isIndexed(slug, l.code));

export const urlFor = (slug: Slug, lang: Lang = DEFAULT_LANG) => `${siteOrigin}${pathFor(slug, lang)}`;

export interface Alternate {
  hreflang: string;
  href: string;
}

// The head and the sitemap both read this, so the hreflang cluster cannot drift between them.
export const alternates = (slug: Slug): Alternate[] =>
  isLocalized(slug)
    ? [...indexedLangs(slug).map((l) => ({ hreflang: l.hreflang, href: urlFor(slug, l.code) })), { hreflang: X_DEFAULT, href: urlFor(slug) }]
    : [];

// A localized page linking an English-only one says so, for the reader and for crawlers.
export const hreflangOf = (slug: Slug, lang: Lang = DEFAULT_LANG) =>
  lang !== DEFAULT_LANG && !isLocalized(slug) ? localeOf(DEFAULT_LANG).hreflang : undefined;

export function pageLink(slug: Slug, label: string, lang: Lang = DEFAULT_LANG) {
  const hreflang = hreflangOf(slug, lang);
  return `<a href="${pathFor(slug, lang)}"${hreflang ? ` hreflang="${hreflang}"` : ''}>${label}</a>`;
}

export const formatDate = (date: Date, lang: Lang = DEFAULT_LANG) =>
  new Intl.DateTimeFormat(localeOf(lang).tag, { dateStyle: 'long', timeZone: 'UTC' }).format(date);

export const lastUpdated = (slug: Slug, lang: Lang = DEFAULT_LANG) =>
  formatDate(new Date(SITE_PAGES.find((page) => page.slug === slug)!.lastmod), lang);

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
