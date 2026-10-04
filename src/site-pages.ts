// Single source of truth for every indexable route.
// Three consumers read it: BaseLayout (canonical, via pathFor), sitemap.xml.ts (<lastmod>) and
// each page's "Last updated" line (via lastUpdated), so they cannot drift. An unregistered page
// is invisible to crawlers.
//
// `lastmod` is a claim made to search engines and readers, not a build artefact. Bump a date only
// when that page's copy actually changed. Never wire it to the build clock.
//
// /, /support, /privacy and /terms are fixed: the iOS app (LegalLinks.swift) and the App Store
// listing (fastlane/metadata/*/{marketing,support,privacy}_url.txt) point at them.
export const SITE_PAGES = [
  { slug: '',        lastmod: '2026-10-03' },
  { slug: 'support', lastmod: '2026-10-04' },
  { slug: 'privacy', lastmod: '2026-10-04' },
  { slug: 'terms',   lastmod: '2026-10-04' },
  { slug: 'search',  lastmod: '2026-10-03' },
] as const;

export type Slug = (typeof SITE_PAGES)[number]['slug'];

export const pathFor = (slug: string) => (slug ? `/${slug}` : '/');

const displayDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

export const lastUpdated = (slug: Slug) =>
  displayDate.format(new Date(SITE_PAGES.find((page) => page.slug === slug)!.lastmod));
