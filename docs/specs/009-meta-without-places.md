---
id: 009
title: "/meta without places, the stored list read when idle, a versioned places.json cached for good"
status: done
created: 2026-10-06
updated: 2026-10-07
repo: ffly-site
release:
depends_on: [008]
conflicts_with: []
tasks: [T1, T2, T3, T4]
source: owner, 2026-10-06 (ffly-api 1.9.0, 1B-bots spec 540)
---

# 009 - /meta without places

> **TL;DR** - Every visit asked `/meta`, which carried all 3,493 places (40 KB gzip, 355 KB of JSON) the site never
> read. The site now asks `/meta?places=false` (about 0.5 KB on API 1.9.0). The stored place list is no longer parsed
> when the script starts but when the page is idle or a place field needs it. A stored list whose version is `/meta`'s
> `places_version` is never fetched again, and `places.json` is fetched as `?v={version}` and cached immutably.

## Cross-Repo Interfaces
| Direction | Interface | Repo / spec | Fallback |
|---|---|---|---|
| consumes | ffly API 1.9.0 `GET /meta?places=false` (`places: []`, everything else unchanged) | 1B-bots spec 540 | An older API ignores the parameter and still sends the places; the site tolerates both. |

## Requirements
1. **T1 Meta without places.** `getMeta` requests `${FFLY_API_BASE}/meta?places=false`, still a simple GET with no
   header. `Meta.places` is optional.
2. **T2 Stored list read on demand.** `PlacesStore` reads no storage in its constructor. `load()` reads the stored copy
   (once per page), else fetches the static file and stores it. `search.ts` keeps both triggers: the first `focusin` in
   the form and `requestIdleCallback` after `load`. A link or cookie naming places still awaits `load()`.
3. **T3 Validity.** Validity is the version alone (the API's `places_version` is a hash of the list's content).
   - Stored version equals `/meta`'s: no request for `places.json` or `/places`, on `load()`, `refresh()` or focus.
   - A different version: exactly one fetch, the static file when it is that version, else the conditional `/places`;
     stored under the new version, so the next visit fetches nothing.
   - A corrupt or partial stored entry counts as absent: one fetch.
   - `refresh` with no version, or a failing `/places`: the held list, else the static list, else `meta.places ?? []`.
     An empty `meta.places` never replaces a held list. An unversioned list is never stored.
4. **T4 Immutable static list.** `fetchStaticPlaces` requests `/places.json?v={WEB_META.places_version}`;
   `vercel.json` serves `/places.json` as `public, max-age=31536000, immutable`. `check-legal` asserts the header and
   that the bundle builds the versioned URL, and that `places.json`'s version is `web-meta.json`'s (a file cached for
   good under another version would never be corrected); `npm run places` fails without a version. PINS and CLAUDE.md
   updated.

## Edge cases
- Storage blocked (private mode): the versioned URL plus the immutable header means the HTTP cache answers a reload.
- Older API (1.8.0): `/meta` still carries the places; they stand in only when nothing else is available.
- A new `places_version` before the site's snapshot is regenerated: the conditional `/places`, as before.

## Verification (2026-10-07)
- `npm test` (vitest 147 tests, build, `check-legal`) and `tsc --noEmit` green. Both new `check-legal` assertions were
  seen failing on a tampered bundle and a `vercel.json` without the rule.
- Headless Chromium on `astro preview`, served as `https://ffly.app` against the live API (1.8.0, which ignores the
  parameter): visit 1 made one `places.json?v=e93bc417e214621a` request (started right after the load event), one
  `/meta?places=false`, no `/places`; "War" in From suggested Warsaw. A reload made no `places.json` and no `/places`
  request. `/search?from=WAW&cities=MAD,AMS` on a first visit filled Warsaw, Madrid, Amsterdam. No console errors.
