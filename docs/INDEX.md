# ffly-site Documentation Index

## Quick Links
- [README](../README.md): pages, local commands, verification
- [CLAUDE.md](../CLAUDE.md): rules for every session (fixed URLs, facts, legal coupling, copy rules)
- [001 - Deployment](001-deployment.md): Vercel project, Namecheap DNS, go-live checks
- [002 - Design, palette and guides](002-design-and-guides.md): Night palette, route map, boarding pass, `/guides` and the `seo/` pipeline
- [Spec 001 - Web search](specs/001-search-web-app.md): `/search`, the free web search on ffly API v1.2
- [000 - Tasks](000-tasks.md): low-severity backlog from the 2026-10-04 audit
- [Bugs](bugs/): 001 Terms vs the web search, 002 Search History linkage (2026-10-04 audit)
- [Spec 002 - Privacy: feedback form](specs/002-privacy-feedback.md): `/privacy` Section 8, linked Email Address and Customer Support
- [Spec 003 - Search on home, results table, nudges](specs/003-search-home-table-nudges.md): `#search` on `/`, custom controls, cookies, notifications, consent-gated ads, light/dark map
- [Spec 004 - Eight languages, analytics behind consent](specs/004-localization-and-analytics.md): `/de` … `/pt` for home, `/search` and `/guides`, canonicals and hreflang, GA4 after Accept
- [Spec 005 - Compact search, shareable links](specs/005-compact-search-and-shared-links.md): nights per leg, two-row form, animated app strip, always-visible table, full trip in the URL, stored results for shared links
- [Spec 006 - Clear buttons, several Back to cities](specs/006-clear-buttons-and-several-back-cities.md): × on place fields, Back to as a chip list, dark-mode range
- [Spec 007 - Localized places, better matching, instant list](specs/007-localized-places.md): names per language, folded and ranked matching, the places snapshot and the stored copy
- [Spec 008 - Worldwide places](specs/008-worldwide-places.md): API 1.8.0's 3,493 places in `public/places.json` (out of the bundle, loaded lazily), a folded index, the country in suggestions
- [Spec 009 - /meta without places](specs/009-meta-without-places.md): `/meta?places=false`, the stored list read when idle, a stored list at the live version never fetched again, `places.json?v=` cached immutably
- [PINS](PINS.md): the ffly API contract version the site codes against
- [Plan - Spec 003](plans/spec-003.md): how spec 003 was built, and its binding deviations

## Documentation Tree
```
README.md (overview + verification)
├── CLAUDE.md (conventions)
├── docs/001-deployment.md (host + DNS)
│   ├── vercel.json
│   └── src/site-pages.ts (the URLs the deploy must serve)
└── docs/002-design-and-guides.md (palette, map, pass, languages, guides)
    └── seo/ (product fence, experience, keywords, published)
```

## Cross-project
- App: `../../0E-extensions/ios-ffly` (`docs/specs/014-night-gold-palette.md` shares this palette; `Template/PrivacyInfo.xcprivacy`,
  `docs/compliance/data-inventory.yaml`, `Template/Core/Constants/LegalLinks.swift`,
  `fastlane/metadata/en-US/*_url.txt`)
- API: `1B-bots` `apps/ffly-api` (`config.py` retention values)
- Feedback: `1B-bots` `shared/form-aggregator` (storage, Telegram forward; no retention job)
- Sibling sites: `../refresher` (tryrefresher.app), `../new-moon` (trynewmoon.app), `../vocele-web` (vocele.app)

## Orphans
- none

---
*Last updated: 2026-10-06 (localized places)*
