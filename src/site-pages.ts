import { LOCALE } from './app';

// Single source of truth for every indexable route.
// Three consumers read it: BaseLayout (canonical, via urlFor), sitemap.xml.ts (<lastmod>) and
// each page's "Last updated" line (via lastUpdated), so they cannot drift. An unregistered page
// is invisible to crawlers.
//
// `lastmod` is a claim made to search engines and readers, not a build artefact. Bump a date only
// when that page's copy actually changed. Never wire it to the build clock.
//
// /, /support, /privacy and /terms are fixed: the iOS app (LegalLinks.swift) and the App Store
// listing (fastlane/metadata/*/{marketing,support,privacy}_url.txt) point at them.
export const SITE_PAGES = [
  { slug: '',        lastmod: '2026-10-05' },
  { slug: 'support', lastmod: '2026-10-05' },
  { slug: 'privacy', lastmod: '2026-10-04' },
  { slug: 'terms',   lastmod: '2026-10-04' },
  { slug: 'search',  lastmod: '2026-10-05' },
  { slug: 'guides',  lastmod: '2026-10-05' },
  { slug: 'guides/cheapest-order-to-visit-cities', lastmod: '2026-10-05' },
  { slug: 'guides/multi-city-vs-one-way-tickets',  lastmod: '2026-10-05' },
] as const;

export type Slug = (typeof SITE_PAGES)[number]['slug'];

// The build's `site` (astro.config.mjs, PUBLIC_SITE_URL), with no trailing slash.
export const siteOrigin = import.meta.env.SITE.replace(/\/$/, '');

export const isSlug = (slug: string): slug is Slug => SITE_PAGES.some((page) => page.slug === slug);

export const DEFAULT_OG_IMAGE = '/og-image.jpg';

export const pathFor = (slug: Slug) => (slug ? `/${slug}` : '/');

export const urlFor = (slug: Slug) => `${siteOrigin}${pathFor(slug)}`;

export const pageLink = (slug: Slug, label: string) => `<a href="${pathFor(slug)}">${label}</a>`;

const longDate = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' });

export const formatDate = (date: Date) => longDate.format(date);

export const lastUpdated = (slug: Slug) => formatDate(new Date(SITE_PAGES.find((page) => page.slug === slug)!.lastmod));

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
