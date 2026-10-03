// Single source of truth for every indexable route.
// Two consumers read it, BaseLayout (canonical, via pathFor) and sitemap.xml.ts,
// so they cannot drift. An unregistered page is invisible to crawlers.
//
// `lastmod` is a claim made to search engines, not a build artefact. Bump a date only
// when that page's copy actually changed. Never wire it to the build clock.
//
// /, /support, /privacy and /terms are fixed: the iOS app (LegalLinks.swift) and the App Store
// listing (fastlane/metadata/*/{marketing,support,privacy}_url.txt) point at them.
export const SITE_PAGES = [
  { slug: '',        lastmod: '2026-10-03' },
  { slug: 'support', lastmod: '2026-10-03' },
  { slug: 'privacy', lastmod: '2026-10-04' },
  { slug: 'terms',   lastmod: '2026-10-03' },
  { slug: 'search',  lastmod: '2026-10-03' },
] as const;

export type Slug = (typeof SITE_PAGES)[number]['slug'];

export const pathFor = (slug: string) => (slug ? `/${slug}` : '/');
