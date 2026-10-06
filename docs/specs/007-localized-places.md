---
id: 007
title: "Localized place names, better place search, and a place list that is there at once"
status: done
created: 2026-10-06
updated: 2026-10-06
repo: ffly-site
release:
depends_on: []
conflicts_with: []
tasks: [T1, T2, T3, T4, T5, T6]
source: owner, 2026-10-06 (localized places on ffly-api 1.7.0)
---

# 007 - Localized place names, better place search, and a place list that is there at once

> **TL;DR** - Places show in the page's language (the API's `names`, English when missing). The place search folds
> case and diacritics, matches the localized and the English name, the code and a city's airport codes, and ranks
> exact code > name prefix > word start > contains. The place fields work the moment the page loads, from the
> visitor's stored copy or a build-time snapshot; `/meta` corrects it, and only a new `places_version` fetches
> `/places`. Before the API's 1.7.0 deploy everything reads as today: English names from `/meta`.

## Contract (ffly-api 1.7.0)
- `Place = {code, name (English), top, airports?, names?}`; `names` is keyed by language (`de`, `pt`, maybe `pt-BR`,
  `zh-Hans`); a missing language means the English `name`.
- `GET /places` -> `{places}` with `ETag` and `Cache-Control: public, max-age=86400`; `If-None-Match` -> 304.
- `/meta` gains `places_version` (the `/places` ETag without quotes) and still carries `places`.

## Requirements
1. **T1 Types and client.** `Place.names`, `Meta.places_version`; `getPlaces(version?)` sends `If-None-Match: "v"` and
   answers `same` on 304, else the places and the ETag's version (`versionOf`).
2. **T2 Display.** `placeName(place, lang)` in `src/scripts/places.ts`: `names[lang]`, then the base language
   (`pt-PT` -> `pt`), then `name`. Every place the widget shows (fields, chips, remove labels, the results line, legs,
   routes) goes through it with `<html lang>`. Names are nominative and never inflected in copy. The example trip on
   the home page (map labels, its description, the boarding pass) is named at build time from the snapshot
   (`exampleCity`, the city of the stop's airport code); `europe-map.json` and the map's `LABELS` stay keyed by the
   English name.
3. **T3 Matching** (`matchPlaces`). `fold` = lowercase, NFD, no diacritics, and the letters NFD keeps whole (ł, ø, ß...).
   The query matches the localized name, the English name, the code and a city's airport codes. Rank: exact code or
   airport code > name or code prefix > a word inside a name starts with it > a name contains it (3+ letters); top
   places first within a rank, else the API's order. Member airports of a multi-airport city stay hidden; the cap is
   `WEB_SEARCH.placeMatches`. A row shows the localized name, the English one muted (`lang="en"`) when it differs,
   the airports and the code tag. A typed name resolves by code, localized or English name, folded.
4. **T4 Instant list.** `scripts/places.mjs` (`npm run places`) writes `src/data/places.json`: the web `/meta`'s
   limits and currency, and `/places` (else `/meta.places`) with its version. On load the form opens on the stored
   copy (`localStorage`, `WEB_SEARCH.placesKey`, `{version, places}`) or the snapshot, with the snapshot's limits:
   fields, chips and prefill work before `/meta` answers; Find route stays disabled until it does. When `/meta`
   lands its limits replace the snapshot's (lists redrawn only when the caps differ), and `PlacesStore.refresh`:
   - no `places_version` (API before 1.7.0): `/meta.places`, nothing stored;
   - the version held: nothing fetched;
   - the snapshot's version: the snapshot, stored;
   - else `/places` conditional on the held version: 304 keeps the held list, 200 is stored under its version;
     a failure falls back to `/meta.places`, unstored.
   A place list that changed renames the picks (From, chips); text being typed is never touched.
5. **T5 Docs.** CLAUDE.md, `docs/002`, `en.ts` (localized, never inflected), spec 003's matching line, PINS 1.7.0.
6. **T6 Tests.** `placeName` fallback chain, `fold`, `cityOf`; `matchPlaces` ranking and folding ("warsch" -> WAR via
   de, "krakow" -> Kraków, "WMI" -> WAR, English always); `PlacesStore` (version change refreshes, 304 keeps the list,
   the snapshot's version, old API, failures, a storage that refuses writes); `getPlaces` headers and answers.

## Edge cases
- The ETag may be weak (`W/"v"`) or unreadable cross-origin (not in `Access-Control-Expose-Headers`): the version then
  comes from `/meta.places_version`.
- A storage that is blocked or full: the page starts from the snapshot every time; nothing breaks.
- A conditional fetch never touches the browser's own HTTP store, so a 304 reaches the page.
- The live caps differ from the snapshot's: the lists are trimmed to the live caps, and Back to switches between the
  single field and the chip list.

## Verification (2026-10-06)
- `npm test`: vitest, build, `check-legal` (mechanics words in pages and the bundle) green.
- Snapshot written from the live `/meta` (307 places, no version, no `names`: the API is still 1.6).
