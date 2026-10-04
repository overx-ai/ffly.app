---
id: 003
title: "The Terms promise a checked time for every fare, but cached partner fares have none"
status: fixed
severity: high
created: 2026-10-04
updated: 2026-10-04
source: audit
repo: ffly-site
files: src/data/terms.ts, src/data/support.ts, src/pages/search.astro, src/site-pages.ts, public/llms.txt, scripts/check-legal.mjs
---

# BUG 003 - The Terms promise a checked time for every fare, but cached partner fares have none

> **TL;DR** — Terms §Prices said "ffly Pro shows when each fare was last checked … cached prices that may be a few days old". ffly-api spec 532 sends Aviasales' cached fares (2–7 days old) with `checked_at: null`, so the app shows no checked time for them. Fixed: "when most fares were last checked … up to a week old and show no checked time", plus the same caveat in Support, no "live fares" on /search, and llms.txt no longer promises the airline's own site.

## Symptom
- `src/data/terms.ts:69-70`: "${APP.proName} shows when each fare was last checked. Some fares are cached prices that may be a few days old."
- ffly-api `services/fare_cache.py` + `constants.UNDATED_PRICE_SOURCES`: Aviasales fares carry `checked_at: null`; ios-ffly `LegRow` then shows no age line.
- `src/pages/search.astro:11` meta: "free on the web, with live fares" — web searches also get those cached fares.
- `public/llms.txt:5-6,36`: "you book each flight on the airline's own site", "the final price is the one on the airline's site".

## Root cause
The copy was written when every source was a live fetch stamped with ffly's own fetch time; spec 532 added a cached partner source and deliberately dropped its checked time, and nothing in `check-legal` tied the copy to that.

## Fix
- `src/data/terms.ts` §Prices: "shows when most fares were last checked. Some fares are cached prices that may be up to a week old and show no checked time."
- `src/data/support.ts` "Why are prices indicative?": "some fares come from a cache and may be up to a week old" (no source named — owner rule).
- `src/pages/search.astro`: meta description drops "with live fares"; `src/site-pages.ts` `/search` lastmod 2026-10-04.
- `public/llms.txt`: Volotea listed; Book is "the airline's site or a booking site"; final price "on the site you book on".

## Regression test
`scripts/check-legal.mjs` (run by `npm test`), all red before the fix:
- Terms `#prices` must not say "when each fare was last checked" and must say "up to a week old".
- llms.txt and every non-legal page must not promise the airline's own site; `/search` must not promise live fares.
- Also pinned (green already): the commission disclosure in Terms `#not-a-travel-agent` and Privacy `#booking-links`, "same for every ffly user", "never your app user id"; the fare-source ban is now case-insensitive and covers llms.txt.
