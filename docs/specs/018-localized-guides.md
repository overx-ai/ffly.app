---
id: 018
title: "Guides written natively in German, French and Spanish"
status: approved
priority: p1
created: 2026-10-21
updated: 2026-10-21
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: [T1, T2, T3, T4]
source: owner, 2026-10-21: "creating articles in popular european languages so that we can rate for other locales better ... we must push more articles"; pilot locales de/fr/es
---

# 018 - Localized guides (de, fr, es pilot)

> **TL;DR** - Guide articles can exist in a locale other than English, under `/{lang}/guides/{slug}`. They are written
> natively from that locale's own keyword research and are never translations of the English guides. Each one is
> self-canonical with no hreflang. This amends spec 004, which kept guide articles English-only.

## Why
- All 3 guides are English only, and the 2026-10-09 GSC export shows 0 pages indexed and 8 impressions.
- vocele.app has the same setup, and there the Spanish articles bring most of the non-brand impressions, ranking around
  position 8 against 30-90 for English. Competition in these languages is thinner.
- Searchers in each market use their own words, so a guide earns a locale only through `/seo research --lang xx`.

## Requirements
1. **T1 Collection by locale.** Guides live at `src/content/guides/{lang}/{slug}.md`, and the existing English files
   move to `src/content/guides/en/`. The schema stays the same; the locale comes from the folder.
2. **T2 Routes.** English guides keep `/guides/{slug}` (no URL change). Other locales are at `/{lang}/guides/{slug}`.
   Each guide is self-canonical with no `alternates()` and no hreflang, because the guides are not twins. `<html lang>`
   and `og:locale` come from `src/i18n/locales.ts`. Slugs are native to their language
   (e.g. `/de/guides/guenstigste-reihenfolge-staedte`).
3. **T3 Discovery.** Each guide is registered in `SITE_PAGES` with its locale, so the sitemap lists it.
   `/{lang}/guides` lists that locale's guides first, then the English ones with the existing "in English" note. The
   localized home links to its locale's guides index, which gives crawlers an internal path to them.
4. **T4 Pilot scope.** de, fr and es only. Content is written via `/seo write <keyword> --lang xx`, with no more than
   2-3 guides per locale until `/seo review` shows impressions. The `seo/keywords.md` and `seo/published.md` tables gain
   a `Locale` column.

## Out of scope
- Translating the 3 existing English guides.
- The other 9 site locales, until the pilot shows signal.
- The indexing investigation. Run `/seo review` first, separately; this spec does not depend on it.

## Verification
- `npm run build` passes. `dist/de/guides/<slug>/index.html` (or `.html`) exists, has its own canonical and contains no
  `hreflang`. The English guide URLs are unchanged.
- `dist/sitemap.xml` lists the localized guides without `xhtml:link` alternates.
