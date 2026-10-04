---
id: 001
title: "ffly.app/search: the free web search on ffly API v1.2"
status: done
created: 2026-10-03
updated: 2026-10-04
repo: ffly-site
tasks: [T1, T2, T3, T4]
depends_on: []
conflicts_with: []
source: owner, 2026-10-03 — approved 1B-bots#524 "build now", placed at "ffly.app/search"
supersedes: 1B-bots docs/specs/524-ffly-web.md (its nginx-SPA architecture; the requirements carry over)
---

# 001 - ffly.app/search: free web search

> **TL;DR** — Built. `ffly.app/search` is a static Astro page whose single bundled TypeScript `<script>` calls
> `https://api.overx.ai/ffly` as an anonymous Free caller. You pick cities and dates, it shows live progress,
> then the Free (redacted) routes with a "get the app for every route" upsell. The ad slots were removed on
> 2026-10-04 (T-014) until an ads step with a consent banner is built.

## Why here, not `1B-bots/apps/ffly-web`
The owner chose the path `ffly.app/search`. ffly.app is this Vercel site, so serving the page here needs no
nginx image, no k8s manifests, no DNS, and no Vercel rewrite. The API already allows `https://ffly.app` in
`OX_CORS_ORIGINS`, and treats a caller with no `X-Client-Id` as Free with a per-IP daily quota.

## Requirements
- **Page:** `src/pages/search.astro`, registered in `src/site-pages.ts`, linked from the header and the home
  hero ("Try it on the web"). Same layout, theme and footer as the other pages.
- **One client script, no new dependency.** A `<script>` in the page (Astro bundles and type-checks it). No
  framework and no runtime dependency, so `astro` stays the only dependency. Every other page stays
  zero-JS.
- **API:** base URL `FFLY_API_BASE` in `src/app.ts` (`https://api.overx.ai/ffly`). Send `X-Platform: web`. Never
  send `X-Client-Id`. `client_request_id` is a fresh `crypto.randomUUID()` per submit. Code against contract
  1.2.0: `1B-bots/apps/ffly-api/contract/openapi.json`.
  - `GET /meta` → places (code, name, top), limits, priorities, `tier_limits.searches_per_day`.
  - `POST /searches` → 202 `{id}`; 402 `PaymentRequired{reason: city_limit|subscription_required}`; 422; 429.
  - `GET /searches/{id}` → poll every 2 s while `fetching|planning`; stop on `done|failed`; 404 resubmits the
    saved request once.
- **Form:** start city, end city (default same as start), 1 to `tier_limits.max_cities` cities to visit (a place
  picker over `/meta` places with type-to-filter), date window (`date_from`, `date_to`, `<input type="date">`,
  window ≤ `limits.max_window_days`), min/max nights, priority (from `/meta` priorities, default
  `default_priority`), and a "direct flights only" checkbox (`max_stops_per_leg: 0`). The same
  validation as the API, before sending.
- **Progress:** `done/total` bar and the ETA. The polling survives a page reload: the id and the request live in
  `sessionStorage`.
- **Results (Free, locked):** route 1 shows the city chain, nights and total price; routes 2+ show price and city
  count (exactly what the API returns: render only fields that are present, never invent them). Insights line
  when `insights` is present. `more_routes` and every locked route lead to the App Store upsell: `APP_STORE_URL`
  when set, otherwise "Coming soon to the App Store". Source coverage: one quiet generic line when any source was
  `partial|unavailable` ("Some fares couldn't be checked right now."), never naming a source.
- **Errors, in plain words:** quota reached (429 or 402 `subscription_required`): "You've used today's free web
  searches. The app has more." City limit (402 `city_limit`): "The free web search takes up to N cities."
  `failed`, or the network is down: retry button. No raw server text shown.
- **Prices:** `Intl.NumberFormat` with the API's `currency`. Dates: `Intl.DateTimeFormat`, English.
- **Ads (removed 2026-10-04, T-014; kept as the design for the future ads step):** none in code, and the CSP in
  `vercel.json` blocks any third-party script. The future step: fixed-height slots (no layout shift) beside the
  form, under the progress card, and between result cards, loaded only after consent. The consent banner is
  part of that later step, not this spec.
- **Privacy:** `/privacy` gains a short "Web search on ffly.app" section. What a web search sends (the trip
  request, kept 24 h with the job). The IP address is used only to count the daily free searches, in memory. No
  cookies, no analytics, no ads yet. Retention values come from `src/app.ts`.
- **SEO:** title "Search cheap multi-city trips — ffly", a meta description, and canonical `/search`. The
  sitemap includes it.
- **Accessibility:** labelled inputs, `aria-live="polite"` on progress and results, keyboard-operable picker.

## Edge Cases & Risks
| Case | Mitigation |
|------|-----------|
| API restart mid-search (404) | resubmit the saved request once, then show retry |
| Tab hidden for a long time | keep polling; the job TTL is 24 h |
| Wizz/azair unavailable | coverage line; results still render |
| Quota per IP shared behind NAT | friendly quota message with the app upsell |
| Script blocked or JS off | `<noscript>` line pointing at the App Store |
| CORS | `https://ffly.app` is allowed; local dev (`localhost:4321`) needs the API's dev CORS or a manual test against prod |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | `src/app.ts` constants (API base, AdSense placeholders), `search.astro` page and form, site-pages + header/hero links | dev | – | done | `src/app.ts`, `src/pages/search.astro`, `src/site-pages.ts`, `src/components/Header.astro`, `src/pages/index.astro` |
| T2 | Client script: meta load, place picker, validation, submit, polling with sessionStorage resume, results/insights/coverage/upsell/error rendering | dev | T1 | done | `src/scripts/search.ts`, `src/styles/*` |
| T3 | Privacy "Web search" section | dev | T1 | done | `src/data/privacy.ts` |
| T4 | Docs: CLAUDE.md (the one-script exception), INDEX, 1B-bots spec 524 marked superseded | dev | T2 | done | `CLAUDE.md`, `docs/INDEX.md` |

## Acceptance Criteria
- [ ] `npm run build` passes (Astro type-checks the script); `dist/search/index.html` exists and the sitemap lists `/search`.
- [ ] A real search against production from a `ffly.app`-origin context returns Free routes and renders them, with a 4-city Warsaw→Budapest→… run as the smoke test.
- [ ] Every other page still ships zero JS (`grep -L '<script' dist/**/index.html` except search).
- [ ] No ad script or request (no ad code ships; `npm test` checks the CSP).
- [ ] One `/code` pass clean.

## As built (2026-10-03)
- The picker is a native `<datalist>` with removable chips. There is one end city, though the API takes up to 3.
- The title uses no em dash (the CLAUDE.md copy rule): "Search cheap multi-city trips | ffly".
- `aria-live` sits on the status line and on the results, not on the whole card, so the fare-check count isn't
  read out every 2 s. The progress bar has `role="progressbar"`.
- The top route is labelled "Top pick: <priority>", because a cheaper route can rank lower under "Best schedule".
- A retry after a network error or 503 reuses the `client_request_id` (deduplicated by the API). A failed or
  expired search retries with a new id.
- The 404 auto-resubmit covers only a search that had not finished and whose `date_from` has not passed. A
  search already shown, or one with past dates, shows "expired" instead of silently spending a free search
  (anonymous web callers get 1 a day). The API reuses a `client_request_id` only while its job lives, so the
  resubmit keeps the original id.
- Smoke test against production: a search from WAR over MAD, AMS and ROM (24 Oct–7 Nov, 2–4 nights) found 6
  routes, the best at €227.22, after comparing 125 fares across 15 days. The coverage line then named AZair
  (partial) and Wizz Air (unavailable).
- 2026-10-04: the coverage line became one generic notice, because fare sources are named only in the legal
  pages. `npm test` checks the notice ships and that no page but `/privacy` and `/terms`, and no bundle, names a
  source that is not also a carrier (AZair, Aviasales, Travelpayouts).
- "Zero JS on every other page" means zero *executable* scripts. Several pages already carried JSON-LD
  `<script type="application/ld+json">`.
