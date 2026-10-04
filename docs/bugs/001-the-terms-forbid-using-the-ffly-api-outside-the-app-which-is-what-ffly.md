---
id: 001
title: "The Terms forbid using the ffly API outside the app, which is what ffly.app/search does"
status: fixed
severity: high
created: 2026-10-04
updated: 2026-10-04
source: audit
repo: ffly-site
files: src/data/terms.ts, src/app.ts, src/site-pages.ts, scripts/check-legal.mjs, package.json
---

# BUG 001 - The Terms forbid using the ffly API outside the app, which is what ffly.app/search does

> **TL;DR** — Acceptable Use (terms.ts:129) forbade accessing "the ffly API other than through the ffly app", yet the site's own /search called that API, and the Terms never mentioned the web search or its daily Free limit. Fixed: the clause now allows "the ffly app or ffly.app", and section 5 gained a "Web search" line (free, 1 per day per network, top route in part).

## Symptom
- `src/data/terms.ts:126`: "…access the ffly API other than through the ffly app…".
- `src/pages/search.astro` + `src/scripts/ffly-api.ts` call `https://api.overx.ai/ffly` from the browser (spec 001).
- The Terms say nothing about the web search; the API gives it 1 Free search per IP per day (`free_searches_per_ip_day=1`).

## Root cause
The Terms were written for the app before spec 001 added the web search at /search, so Acceptable Use still assumed the app was the only client of the ffly API, and section 5 (Free and ffly Pro) described only the app's tiers.

## Fix
- `src/data/terms.ts:129`: "access the ffly API other than through the ffly app or ffly.app".
- `src/data/terms.ts:79-81`: section 5 "Web search" item: searches at ffly.app/search are free, limited to `WEB_SEARCH.freeSearchesPerDay` per day per network, and show the cities, nights and total price of the top route, and only the price and number of cities of the other routes (what `src/scripts/search.ts` `renderResults` draws).
- `src/app.ts:73`: `WEB_SEARCH.freeSearchesPerDay: 1`, the API's `free_searches_per_ip_day` (spec 001 "As built"), so the Terms do not hardcode the limit.
- `src/site-pages.ts`: `/terms` lastmod 2026-10-04.

Wording note: the line says "the top route" with the other routes' price and city count rather than "top route only", because the page does render those for the other routes.

## Regression test
`scripts/check-legal.mjs:23` (Acceptable Use names ffly.app) and `scripts/check-legal.mjs:24` (section 5 mentions the web search), run by `npm test` (`astro build` then the check over `dist/terms/index.html`). Both failed before the fix and pass after.
