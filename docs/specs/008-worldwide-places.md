---
id: 008
title: "Worldwide places: the place list out of the bundle, a folded index, the country in suggestions"
status: done
created: 2026-10-06
updated: 2026-10-06
repo: ffly-site
release:
depends_on: [007]
conflicts_with: []
tasks: [T1, T2, T3, T4, T5]
source: owner, 2026-10-06 (ffly-api 1.8.0, 1B-bots spec 539)
---

# 008 - Worldwide places

> **TL;DR** - ffly-api 1.8.0 lists 3,493 places worldwide (was 307), each with a nullable `country`. Spec 007 bundled
> the list into the search script; at this size that is 430 KB of JavaScript. The list now lives in
> `public/places.json` (same origin, fetched on the first focus in the form or once the page is idle, then kept in
> `localStorage`), and only the limits the form opens on stay bundled. Matching folds each list once per language.
> Suggestions name the country ("London · Canada").

## Contract (ffly-api 1.8.0)
- `Place` gains `country`: ISO 3166-1 alpha-2, nullable. Nothing else changes: `/places` (weak ETag, gzip), `/meta`
  `places_version`, `/meta.places` still every place without `names`.

## Requirements
1. **T1 Split snapshot.** `npm run places` writes `src/data/web-meta.json` (the web `/meta`'s `currency`, `limits`,
   `tier_limits` and `places_version`; bundled, read at first paint) and `public/places.json` (`{version, places}`,
   names trimmed to the site's eight languages, one place per line). `WEB_SEARCH.placesUrl` names the file.
2. **T2 Lazy list.** `PlacesStore` (`places-store.ts`):
   - opens on the stored copy (`WEB_SEARCH.placesKey`), else on nothing;
   - `load()`: the stored copy, else the static file, fetched once (concurrent calls share it; a failure is retried
     next time), stored under its version; never replaces a list `refresh` already chose;
   - `refresh(meta)`: no `places_version` -> `/meta.places`, unstored; the held version -> nothing; the static file's
     version (`web-meta.json`) -> the static file, unless it turns out older; else `/places` conditional on the held
     version, names trimmed to the site's languages, stored; a failure -> `/meta.places`, unstored.

   `search.ts`: the fields open at once on the bundled limits. The list loads on the first `focusin` in the form or
   at `requestIdleCallback` after `load`. Only a link or cookie that names places (`namesPlaces`) makes the form wait
   for the list before prefill. Until it is there a place field shows "Loading cities…" (no lock glyph), never an
   empty list; Enter in Cities does nothing. When it arrives, picks are renamed and an open list redraws
   (`Combobox.update`). `/meta` is requested at once, in parallel.
3. **T3 Folded index.** `matchPlaces` folds codes, names and words once per list and language (a `WeakMap` on the list);
   the rules are spec 007's, unchanged. Measured on the 3,493 places (Node, M-series): about 5 ms a keystroke before,
   0.3-0.4 ms after; building the index costs 6-10 ms once, on the first open. `tests/combobox.test.ts` holds the best of
   five rounds under 3 ms.
4. **T4 Country.** A suggestion row adds the country in the page's language after the names
   (`countryNamer`: `Intl.DisplayNames([lang], {type: 'region', fallback: 'none'})`; no country, an unknown code or no
   `Intl.DisplayNames` -> nothing). The separator is CSS (`·`, empty alt text). Only the suggestion list: chips, fields
   and results never show it.
5. **T5 Docs.** PINS 1.8.0, README, CLAUDE.md, this spec. The example trip (map, pass) is named at build time from
   `public/places.json` (`src/example-city.ts`, never in the client bundle).

## Edge cases
- A browser cache serves an older `places.json` than the bundle's version: `refresh` sees the file's own version and
  asks `/places`.
- Storage blocked or full: every page loads the static file again (HTTP-cached; Vercel revalidates by ETag).
- No API at all: the static file still drives the fields; Find route stays disabled (it needs `/meta`).
- The static file fails too: the fields stay "Loading cities…" and the next focus retries; `/meta.places` fills in
  when `/meta` answers.

## Sizes (2026-10-06)
| | raw | gzip |
|---|---|---|
| Search chunk before (307 places bundled) | 59,745 B | 18,989 B |
| Search chunk after (no places) | 28,216 B | 10,845 B |
| `public/places.json` (3,493 places, 8 languages) | 431,894 B | 75,798 B (brotli 58,213 B) |
| `/places` from the API (49 languages) | 1,903,542 B | 560,168 B |

## Verification (2026-10-06)
- `npm test`: vitest, build, `check-legal` green.
- Headless Chromium on `npm run preview`: a first visit with a slowed file shows "Loading cities…", then "London ·
  United Kingdom", "London · Canada"; one `places.json` request, stored; a reload asks nothing; `?from=WAW&cities=MAD,MOW`
  on a first visit fills Warsaw, Madrid, Moscow; with `api.overx.ai` blocked `/pl/search` finds "Moskwa · Rosja".
