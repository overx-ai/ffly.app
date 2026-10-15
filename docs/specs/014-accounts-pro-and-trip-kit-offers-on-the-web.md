---
id: 014
title: "Accounts, Pro and Trip kit offers on the web"
status: approved
priority: p1
created: 2026-10-15
updated: 2026-10-15
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
source: META_STATE bridges/012-1b-bots-to-0e-extensions--ios-ffly.md
---

# 014 - Accounts, Pro and Trip kit offers on the web

> **TL;DR** - ffly.app/search gains optional Apple and Google sign-in; a signed-in Pro subscriber gets Pro limits and
> Book direct, Free sees a Pro teaser and an App Store upsell, and every search shows Trip kit offers. Book and kit
> clicks become consented GA4 events. Owner: set the Google client id and `APP_STORE_ID`; nothing shows before ffly API
> 1.12.0.

**Amendment (founder, 2026-10-15), overrides anything below that disagrees:** booking links carry no commission
line (Terms and Privacy disclose it, and commission never changes the order of results). Each Trip kit block is headed
**"Partner offers"** instead of the sentence "ffly may earn a commission", so the offers read as ads (EU UCPD, US FTC).

**Related**: [001 - Free web search](001-search-web-app.md), [004 - Localization and analytics](004-localization-and-analytics.md)
(consent, GA4), [013 - Legal pages ready for accounts and partner offers](013-legal-pages-ready-for-accounts-and-partner-offers.md)
(the `#account` and `#partner-offers` copy this relies on).

## Requirements
Founder, 2026-10-15 (bridge 012, approved). Copy rules: never "unlimited", never "cheapest guaranteed", never name where
fares come from. Free copy: "partner fares". Pro copy: "the lowest fares we find, including direct airline fares".

**Sign-in**
- R1 Sign in with Apple (Apple JS, Services ID `ai.overx.ffly.web`, set up by 1B-bots spec 573) and with Google (Google
  Identity Services). Optional: the search works exactly as today without it.
- R2 Astro server routes on Vercel exchange the provider token with auth.overx.ai (`/apple/token`, `/google/token`).
- R3 The refresh token lives in an httpOnly, Secure, SameSite cookie on ffly.app. A short-lived access token reaches page
  JS **in memory only**, through `/api/auth/token`; never in `localStorage`, `sessionStorage`, a JS-readable cookie or
  the URL.
- R4 Calls to ffly-api send `Authorization: Bearer <access token>` while signed in, and no auth header otherwise.
- R5 Sign out revokes the refresh token at auth.overx.ai and clears the cookie.

**Pro on the web**
- R6 Pro users (verified server-side by ffly-api against RevenueCat on the account) get the Pro limits. The founder's
  design for the server (1B-bots spec 574): Pro 8 cities and 3 ends, 100 searches a day, the lowest fares we find
  including direct airline fares, a per-leg choice of Book direct or via partner, and priority. Free: 4 cities and 2
  ends, 5 a day, full routes, partner fares. **Every limit comes from `/meta` `tier_limits`; the site never hardcodes
  one** and never gates a Pro feature itself: it renders what the API returns for the caller.
- R7 The upsell sends people to the App Store (no web checkout this round), with App Store badges once `APP_STORE_ID`
  is set ("Coming soon" until then, as today), and offers "Already have Pro? Sign in with the same account".
- R8 **Pro teaser**: `route.pro_preview` renders as "Pro found this route about €X cheaper" (whole currency units,
  `Intl.NumberFormat` with the API's currency). With the flag on it replaces today's `app_hint` line: one teaser.

**Trip kit offers**
- R9 During the search, in the progress card: `GET /trip-kit` with the cities and the date window. After it, under each
  route (in its expanded details): `route.trip_kit[]`. Each block is headed "Partner offers". The web always
  shows them (no Pro setting on the web yet). Text only, no partner images.

**Tracking**
- R10 Book clicks (today a plain, untracked link) and kit clicks become GA4 events through the consented analytics
  (GA4 after Accept). Links work the same without consent: the click never waits for or depends on tracking.

**Contract**
- R11 Consume ffly API 1.12.0 (1B-bots spec 574): `Authorization`, `leg.offers[]`, `route.pro_preview`,
  `GET /trip-kit`, `route.trip_kit[]`. Pin it in `docs/PINS.md` with fixture-based consumer contract tests. Until
  1.12.0 is live, the new UI hides behind one flag, `CONTRACT_1_12` in `src/app.ts`, shared with spec 015 (whichever
  lands first adds it).

## Architecture
- **Hybrid output.** Astro 4 `output: 'hybrid'` with `@astrojs/vercel` (serverless): every page stays prerendered;
  only `src/pages/api/auth/*.ts` set `export const prerender = false`. This ends "one dependency: `astro`" (CLAUDE.md
  Tech Stack); the adapter is the second and only other runtime dependency.
- **Server** `src/server/auth-session.ts`, ported from Mushtra's `sites/mushtra/src/lib/server/mushtraSession.ts`
  (exchange, refresh, revoke, cookie helpers) to Astro `APIRoute`. Unlike Mushtra, the cookie holds the refresh token
  only (plus a device id if auth.overx.ai requires one, inside the same value: no second cookie), never the access
  token. Constants in `src/app.ts`: one `AUTH` object with `base` (https plus `SERVICE.authHost`, from spec 013),
  `appleServiceId: 'ai.overx.ffly.web'`, `googleClientId` (undefined until the owner sets it), `cookie: 'ffly_session'`,
  `days` and `refreshSkewS`. Cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`. Every route sends
  `Cache-Control: no-store`, requires the site's `Origin`, takes POST or DELETE only, and holds no secret (public ids
  only):

| Route | Does | Answers |
|---|---|---|
| `POST /api/auth/apple` `{identityToken}` | auth `/apple/token` | as `/api/auth/token` |
| `POST /api/auth/google` `{credential}` | auth `/google/token` | as `/api/auth/token` |
| `POST /api/auth/token` | auth `/token` with the cookie's refresh token; rotates the cookie | `{access_token, expires_at}`, or 401 and a cleared cookie |
| `DELETE /api/auth/session` | auth `/revoke`; clears the cookie | 204 |

- **Client.** `src/scripts/auth-state.ts` (DOM-free, tested: token expiry and refresh timing, the header for a request,
  the 401 decision) and `src/scripts/auth.ts` (the sign-in sheet). The provider scripts load only when the visitor opens
  Sign in: Apple JS (`AppleID.auth.init` with `usePopup: true`, scope `email` only, matching /privacy `#account`;
  `signIn()` called inside the click handler) and GIS (`renderButton`, plus One Tap inside the sheet). The sign-in row
  lives in the search widget (`SearchForm.astro`, on `/` and `/search` in 13 languages); other pages stay zero-JS.
- **API calls.** `ffly-api.ts` takes headers from `auth-state`: none while signed out, so anonymous GETs stay simple
  CORS requests with no preflight (PINS.md); `Authorization: Bearer` while signed in. A 401 refreshes once through
  `/api/auth/token` and retries; a second 401 signs out locally and continues as Free. Sign-in and sign-out re-fetch
  `/meta`, and the existing `applyMeta` re-renders the caps.
- **Results.** `results.ts` maps `leg.offers[]` (falling back to `leg.link` on 1.11) to Book buttons: one per offer the
  API returns, labelled Book direct or Book via partner; offer URLs used as-is through `safeLink`, with `rel="sponsored
  noopener"`. The partner tag is set by ffly-api; the site never adds a parameter.
- **Upsell limits.** The comparison names Pro's numbers only if `/meta` exposes them (574); otherwise it names none.
- **Trip kit.** `getTripKit` in `ffly-api.ts` (`commaQuery`). Category headings come from the site's i18n by category id
  (an unknown id is skipped); offer labels from the API, rendered with `textContent`. Empty or failed answers hide the
  block and never delay the search.
- **Tracking.** `src/scripts/track.ts`: `track(event, params)` calls gtag only once consent is granted and GA has
  loaded, else does nothing; `transport_type: 'beacon'`; never `preventDefault`. Event names live in `src/app.ts`
  (`EVENTS`). Params are placement (`results`, `progress`, `route`), offer kind or kit category, and tier. Never a
  city, date, price or account id.
- **CSP.** While sign-in is on: `script-src https://appleid.cdn-apple.com https://accounts.google.com`, `frame-src
  https://accounts.google.com`, `connect-src https://accounts.google.com`, `style-src https://accounts.google.com`.
  check-legal gets `AUTH_CSP`, on exactly while `AUTH.googleClientId` and `CONTRACT_1_12` are set (as `GA_CSP`).
- **Privacy.** /privacy `#website` names `AUTH.cookie` (check-legal already requires every `src/app.ts` cookie there).
  Everything else is spec 013's copy.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| Apple JS popup blocked, or third-party cookies blocked | no Apple sign-in | load Apple JS when the sheet opens so `signIn()` runs in the click; on `popup_blocked_by_browser`, a localized "allow pop-ups" line; Google stays available | founder |
| Google One Tap dismissed or in its cooldown | no prompt | the rendered GIS button is always in the sheet; never re-prompt in a loop | founder |
| Session expired or revoked | 401 on `/api/auth/token` | cookie cleared, page drops to Free silently with one "You're signed out" line | founder |
| Pro user not signed in, or signed in with another provider than the purchase | sees Free limits | upsell leads with "Already have Pro? Sign in with the same account" before the App Store | founder |
| ffly-api rejects the token | search fails | refresh once and retry; a second 401 signs out locally and continues as Free; no loop | founder |
| Safari ITP | lost session | the cookie is first-party and server-set on ffly.app, not script-written storage; the access token is fetched again on each load; Safari has no FedCM, so GIS falls back to its popup button | founder |
| `Authorization` makes signed-in requests preflight | blocked by CORS | ffly-api 1.12.0 allows `Authorization` from https://ffly.app (574); anonymous requests stay header-free | PINS.md |
| XSS steals the access token | account misuse | memory only, short-lived; rendering stays `textContent`/`<template>`; CSP has no inline script | CLAUDE.md |
| CSRF on `/api/auth/*` | forced sign-out or token use | SameSite=Strict, `Origin` check, POST/DELETE only | analysis |
| API older than 1.12.0 | new fields absent | `CONTRACT_1_12` false: no sign-in, offers, teaser or kit; Book uses `leg.link`, as today | founder |
| The adapter moves the built pages out of `dist/` | check-legal reads a stale or missing tree | point check-legal's `DIST` at the adapter's static output (Astro 4's Vercel adapter writes under `.vercel/output/static`; confirm) | analysis |
| A partner or fare-source name lands in the bundle | house rule broken | names arrive at runtime from the API, never in i18n strings; check-legal `MECHANICS` still scans the bundle | CLAUDE.md |
| "cheapest guaranteed" or "unlimited" in any language | copy rule broken | check-legal bans "unlimited" (`UNLIMITED`) already; add a "guaranteed" + cheapest/lowest ban | founder |

## Cross-Repo Interfaces
| Direction | Contract | Pinned version | Owner repo/spec | Fallback until available |
|-----------|----------|----------------|-----------------|--------------------------|
| consumes | ffly API: `Authorization: Bearer` (Pro via RevenueCat on the account), `leg.offers[]`, `route.pro_preview`, `GET /trip-kit`, `route.trip_kit[]`, CORS allowing `Authorization` from ffly.app | 1.12.0 | 1B-bots spec 574 | `CONTRACT_1_12` false: none of the new UI renders and requests stay anonymous |
| consumes | `/meta` `tier_limits` for the caller's tier, and Pro's limits for the upsell if exposed | 1.12.0 | 1B-bots spec 574 | the upsell names no Pro number |
| consumes | auth.overx.ai `POST /apple/token` `{identity_token}`, `POST /google/token` `{id_token}`, `POST /token` `{refresh_token}`, `POST /revoke`; answers `{access_token, refresh_token, expires_in, token_type}` | as Mushtra's web uses it, 2026-10-15 | 1B-bots spec 573 (Services ID `ai.overx.ffly.web`, the ffly Google web client, `https://ffly.app` return URL) | sign-in hidden while `AUTH.googleClientId` is unset or `CONTRACT_1_12` is false |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | `docs/PINS.md` row for 1.12.0; 1.12.0 fixtures; consumer contract tests parsing them through the site's types (`leg.offers`, `pro_preview`, `trip_kit`, `/trip-kit`, `tier_limits`); `CONTRACT_1_12` | dev | - | todo | docs/PINS.md, tests/contract/ffly-api-1.12.test.ts, tests/fixtures/ffly-api-1.12/*.json, src/app.ts |
| T2 | Hybrid output and the Vercel adapter; check-legal `DIST`; prerender stays on for every page | dev | - | todo | astro.config.mjs, package.json, package-lock.json, scripts/check-legal.mjs |
| T3 | Server auth module and the four routes, with tests (cookie attributes, rotation, revoke, Origin, no-store, 401 path) | dev | T2 | todo | src/server/auth-session.ts, src/pages/api/auth/{apple,google,token,session}.ts, tests/auth-session.test.ts |
| T4 | Client auth: `auth-state.ts` (tested), `auth.ts`, the sign-in row and sheet, `AUTH` constants, CSP and `AUTH_CSP` | dev | T3 | todo | src/scripts/auth-state.ts, src/scripts/auth.ts, src/components/SearchForm.astro, src/styles/search.css, src/app.ts, vercel.json, scripts/check-legal.mjs, tests/auth-state.test.ts |
| T5 | `ffly-api.ts`: auth headers, 401 refresh and retry, `/meta` re-fetch on sign-in and sign-out, 1.12.0 types, `getTripKit` | dev | T1, T4 | todo | src/scripts/ffly-api.ts, src/scripts/search.ts, tests/ffly-api.test.ts |
| T6 | Results: Book direct or via partner per leg, Pro teaser replacing `app_hint`, upsell with badges and "Sign in with the same account", limits from `/meta` | dev | T5 | todo | src/scripts/results.ts, src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css, tests/results.test.ts |
| T7 | Trip kit: progress block and per-route block, each headed "Partner offers" | dev | T5 | todo | src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css |
| T8 | Tracking: `track.ts`, `EVENTS`, Book and kit clicks, consent state exposed by `consent.ts` | dev | T6, T7 | todo | src/scripts/track.ts, src/scripts/consent.ts, src/scripts/search.ts, src/app.ts, tests/track.test.ts |
| T9 | Copy in 13 languages (sign-in, plans, teaser, kit, errors); the "guaranteed" ban; /privacy `#website` cookie line | dev | T6, T7 | todo | src/i18n/{en,de,fr,es,it,nl,pl,pt,ru,sv,da,nb,fi}.ts, scripts/check-legal.mjs, src/data/privacy.ts |
| T10 | Docs: CLAUDE.md (Tech Stack, auth, tracking), README Verification, PINS prose on preflight | dev | T8, T9 | todo | CLAUDE.md, README.md, docs/PINS.md |

## Acceptance Criteria
- [ ] With `CONTRACT_1_12` false the built pages and the search behave exactly as today (no sign-in row, no new requests).
- [ ] Signed out: no request to Apple or Google hosts, no `Authorization` header, anonymous API GETs send no preflight.
- [ ] Sign in with Apple (popup) and Google work on ffly.app; the cookie is `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`; no access token in any storage, JS-readable cookie or URL.
- [ ] A Pro account gets its caps and daily searches from `/meta` and per-leg Book direct or via partner; a Free visitor gets Free caps, the teaser and the App Store upsell. No limit is a literal in the site's code.
- [ ] Trip kit shows in the progress card and under each route, each block headed "Partner offers".
- [ ] Book and kit clicks send GA4 events only after Accept; with Reject or no choice the links still open.
- [ ] Sign out clears the cookie and drops the page to Free; an expired session does the same without an error loop.
- [ ] Consumer contract tests green against the 1.12.0 fixtures; `npm test` green.
- [ ] Code review clean.
