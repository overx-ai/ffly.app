---
id: 016
title: "Web search window, v2 copy and sign-in per provider"
status: done
priority: p1
created: 2026-10-16
updated: 2026-10-16
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
source: META_STATE bridges/012-1b-bots-to-0e-extensions--ios-ffly.md (founder 2026-10-16)
---

# 016 - Web search window, v2 copy and sign-in per provider

> **TL;DR** - The site took the web's search limit from ffly API 1.13.0's `/meta` window (the home FAQ says 10 every
> 12 hours) and gave every app claim a true v2 version behind `CONTRACT_1_12`, picked in `editionOf`. Apple and Google
> sign-in went per provider, and Pro lost the Free nudges. Owner: run `npm run places` to refresh the stale snapshot.

**Related**: [014 - Accounts, Pro and Trip kit offers on the web](014-accounts-pro-and-trip-kit-offers-on-the-web.md)
(sign-in, `CONTRACT_1_12`, the R6 rule that no limit is a literal), [015 - Feature parity with the iOS app](015-feature-parity-with-the-ios-app.md)
(the nudge rotation, the "In the app" chips), [013 - Legal pages ready for accounts and partner offers](013-legal-pages-ready-for-accounts-and-partner-offers.md)
(one wording for 1.0 and v2).

## Requirements
Founder, 2026-10-16, quoted: "increase search cap to 10 in the web per 12 hours"; v2 Free is "10 per 12h everywhere"
(app and web, signed in or not; the web from today); "focus on v2"; "i wanted that site also have nice items from the
app available after login via siwa for the person with sub from the app. we must update all copies and claims on the
site to match the reality"; "we must have sign in with google as well, as we will build android port".

Facts the copy must match:

| | Production now (1.0) | v2 (`CONTRACT_1_12` on) |
|---|---|---|
| App Free | 3 searches per install, ever | 10 searches every 12 hours, every route in full, partner fares, Trip kit on |
| Web | 5 per IP per day, 10 per 12 hours once 1B-bots spec 575 deploys; first routes in full | same as app Free |
| Pro | every route in full, daily fair-use cap | more cities and places to finish, the lowest fares we find including direct airline fares, Book direct or via a partner per flight, priority when busy, Trip kit can be switched off; Pro bought in the app applies on ffly.app after signing in with the same Apple or Google account |

Copy rules (CLAUDE.md, check-legal): never "unlimited", never "cheapest guaranteed", no em dashes, no source or vendor
names, no city or place counts ("up to 8"). Free copy says "partner fares"; Pro copy says "the lowest fares we find,
including direct airline fares". "Cheaper", "goes first" and "more cities" are Pro claims, never app claims.

**Live now (flag off)**
- R1 The web limit comes from `/meta`, never from the site. With 1.13.0's `tier_limits.searches_per_window` and
  `window_hours`: the note under Find routes reads "{n} free web searches left.", a spent quota reads "You've used your
  free web searches for now. More in up to {h} hours.", and the home FAQ says "On the web, you can search {n} times
  every {h} hours." (from the bundled `src/data/web-meta.json`, which `npm run places` writes). Without the fields:
  count-free wording ("Try again later.", "You can also try a search on the web, free.").
- R2 `WEB_SEARCH.freeSearchesPerDay` is deleted (it broke spec 014 R6).
- R3 The app rotation's free-search tip is a plural in every language (ru and pl hardcoded one form beside
  `APP.freeSearches`).
- R4 Today's 1.0 app claims stay while the flag is off: they are true for 1.0.
- R5 English-only pages hold for both 1.0 and v2 with no count: `src/data/support.ts`, the three guides and
  `public/llms.txt`, whose description of the web results is corrected too.

**v2 copy, behind `CONTRACT_1_12`, in all 13 languages**
- R6 Rewritten to v2: home plans, FAQ (free, Android), the nudge rotation (still 6 tips), the app strip's price line,
  the progress card's queue line, `search.lead`, the quota and city-limit lines, and the locked-route lines
  (`more`, `lockedRow`, `appHint`), which v2 never sends but which ship in the page.
- R7 The "More cities" chip (a plan limit under "In the app") is 1.0 only; the "In the app" group hides while none of
  its chips shows.
- R8 The 1.0 or v2 choice is made in one place, for every key both editions render.

**Sign-in per provider**
- R9 `SIGN_IN = CONTRACT_1_12 && (Apple ready || Google ready)`. Apple is ready when `AUTH.appleServiceId` is set and
  `AUTH.appleRegistered` is true (the Services ID registered with its return URL, 1B-bots spec 573 T1); Google when
  `AUTH.googleClientId` is set. Either can go live alone. Google stays fully supported (an Android port is coming).
- R10 Only a ready provider's button renders and only its script loads; the Google button's container stays hidden
  until Google renders into it.
- R11 The CSP is required per ready provider (Apple: `script-src appleid.cdn-apple.com`; Google: `accounts.google.com`
  in `script-src`, `frame-src`, `connect-src`, `style-src`), in `vercel.json` and in check-legal.
- R12 /privacy's website sentence names the enabled providers while sign-in is on. The rest of `#account`, the summary
  and `#sharing` keep naming Apple and Google: they cover the app, which signs in with both (ios-ffly spec 034).
- R13 Nothing turns `CONTRACT_1_12` on and no id is invented.

**Pro on the web**
- R14 A signed-in Pro account (`/meta` `tier: pro`, flag on) sees no app strip, no queue line, no quota note and no
  city-limit line or notice; the status reads "Signed in with ffly Pro" (spec 014's `signedInPro`).

## Architecture
- **Editions** (`src/i18n/edition.ts`). Each dictionary carries a `v2` block: the keys whose v2 copy differs, in the
  dictionary's own shape. `overlay(base, top)` replaces leaves; a plural object or a list is replaced whole, never merged
  form by form (a Polish `few` must not survive under a new `other`). `useLang` serves `editionOf(dict, CONTRACT_1_12)`,
  so every view, `data-i18n` and JSON-LD reads the edition and nothing else branches on copy. The `v2` block is typed
  `satisfies Override<typeof base>` in `en.ts`, and every language `satisfies Dict`, so a missing v2 key fails the
  key-parity test like any other. Spec 014's flag-only UI (`widget.offers`, `widget.account`) keeps its own keys: it
  renders only in v2.
- **Window** (`src/scripts/ffly-api.ts`): `Meta.tier_limits` gains optional `searches_per_window` and `window_hours`;
  `searchWindow(limits)` answers `{searches, hours}` only when both are positive. `src/scripts/quota.ts` (DOM-free):
  `quotaNote(meta, pro, text, locale)` (nothing for Pro or an uncounted caller, else the searches left, else the spent
  line) and `quotaSpent(meta, text, locale)` (with the window's hours, else the count-free line). The hours are a plural
  of their own, so ru and pl agree with 12 and 24. Home's FAQ reads `searchWindow(WEB_META.tier_limits)` at build;
  `scripts/places.mjs` copies the two fields into `web-meta.json` when `/meta` has them.
- **Nudges** (`src/scripts/nudges.ts`): `webNudges(widget, tag)` resolves the plural tip with `APP.freeSearches`.
  `tipsOf` goes: the v2 rotation never had the flight hours tip.
- **Pro** (`src/scripts/search.ts`): `isPro()` = flag on and `tier() === 'pro'`. `renderPlan()` (from `applyMeta`)
  hides `#app-side` and `#queue-nudge` and redraws the quota note; the city box shows no cap notice and hides once full,
  as Back to does; a `city_limit` answer reads the generic `invalid` line, with no upsell.
- **Sign-in** (`src/app.ts`): `AUTH.appleRegistered` (false), `signInProviders(contract, auth)`, `SIGN_IN_PROVIDERS`,
  `SIGN_IN`. `auth.ts` loads each ready provider's script when the sheet opens. `scripts/sign-in.mjs` holds the
  per-provider CSP hosts and the same readiness, read from `src/app.ts`'s `AUTH` text (check-legal cannot import
  TypeScript); a test holds both readings to one answer. The owner adds a provider's hosts to `vercel.json` in the commit
  that makes it ready, and `npm test` names them.
- **Pins in check-legal**: no English page or `llms.txt` states a web search count except the FAQ's, which must equal
  `web-meta.json`'s window and be absent without one; with the flag on, no English page claims the app is cheaper or
  skips the queue. A vitest holds the v2 edition of every language to rewritten claim keys, and English to no app claim.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| 1.13.0 not live: `/meta` has no window fields | a count or hours with no source | count-free lines; the FAQ says "free" with no number | founder |
| 1.13.0 live but `web-meta.json` not regenerated | FAQ count-free while the widget counts | harmless and true; the owner runs `npm run places` at the re-pin | own |
| Hours plural in ru and pl ("12 часов", "24 часа") | wrong grammar | the hours are their own plural object in every language | CLAUDE.md |
| A v2 plural merged form by form | a 1.0 `few` form survives under v2 | `overlay` replaces any plural or list whole; a test pins it | own |
| Pro runs out of its fair-use cap | "free searches" said to Pro | the v2 spent line is tier-neutral ("your searches") | founder |
| Pro at the city cap | a silent no-op pick | the city box hides once full for Pro, as Back to does | own |
| Apple ready, Google not | a dead Google button or its script loading | only ready providers render and load; CSP and /privacy follow | founder |
| Sign-in off | /privacy changes for nothing | the website sentence keeps naming both, as today, until sign-in is on | spec 013 |
| A stale `/meta` refuses an option under v2 | an "In the app" chip | the chip is still true (the app has it); the group shows only with a chip | spec 015 |
| v2 API locks a route for Free | 1.0's "in the app" lines | v2 `more`, `lockedRow` and `appHint` name ffly Pro | founder |
| A translation reads as "unlimited" or "cheapest guaranteed" | house rule broken | check-legal `UNLIMITED`, `GUARANTEED` and `CHEAPEST` scan every page and the payload | CLAUDE.md |

## Cross-Repo Interfaces
| Direction | Contract | Pinned version | Owner repo/spec | Fallback until available |
|-----------|----------|----------------|-----------------|--------------------------|
| consumes | ffly API `/meta.tier_limits.searches_per_window` (10 Free and web, 100 Pro), `window_hours` (12 Free and web, 24 Pro), both required and nullable, `searches_per_day` as the daily total, `free_searches_left` per window | 1.13.0, published (1B-bots `apps/ffly-api/contract/openapi.json` at `2c1201318`) | 1B-bots spec 575 | no window (older API, or null): count-free copy; the quota note still counts `free_searches_left` |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | `docs/PINS.md` row for 1.13.0; 1.13.0 fixtures; contract test through `searchWindow` and `quota.ts`; `Meta` window fields; `places.mjs` carries them | dev | - | done | docs/PINS.md, tests/fixtures/ffly-api-1.13/*.json, tests/contract/ffly-api-1.13.test.ts, tests/contract/json-schema.ts, tests/contract/ffly-api-parity.test.ts, src/scripts/ffly-api.ts, scripts/places.mjs, src/data/web-meta.json |
| T2 | Editions: `overlay`, `editionOf`, `isPlural`; `useLang` serves the edition | dev | - | done | src/i18n/edition.ts, src/i18n/index.ts, src/i18n/text.ts |
| T3 | Limit copy from `/meta`: `quota.ts`, the widget's quota note and spent line, Home's FAQ window, the plural tip, `tipsOf` and `freeSearchesPerDay` removed | dev | T1, T2 | done | src/scripts/quota.ts, src/scripts/search.ts, src/scripts/nudges.ts, src/views/Home.astro, src/app.ts, src/components/AppStrip.astro, src/components/SearchForm.astro |
| T4 | English: the live keys and the `v2` block | dev | T2 | done | src/i18n/en.ts |
| T5 | The same keys in 12 languages, in each file's tone | dev | T4 | done | src/i18n/{de,fr,es,it,nl,pl,pt,ru,sv,da,nb,fi}.ts |
| T6 | Pro on the web: `renderPlan`, the city box, `city_limit` for Pro; "More cities" chip 1.0 only, the "In the app" group hidden while empty | dev | T3 | done | src/scripts/search.ts, src/components/SearchForm.astro |
| T7 | Sign-in per provider: `AUTH.appleRegistered`, `signInProviders`, `auth.ts`, the sheet, `scripts/sign-in.mjs`, check-legal CSP and /privacy website sentence | dev | - | done | src/app.ts, src/scripts/auth.ts, src/components/SearchForm.astro, scripts/sign-in.mjs, scripts/check-legal.mjs, src/data/privacy.ts |
| T8 | Count-free English pages: support, three guides (`updated`), `llms.txt`; `SITE_PAGES` lastmods | dev | - | done | src/data/support.ts, src/content/guides/*.md, public/llms.txt, src/site-pages.ts |
| T9 | Tests: limit copy with and without the window, provider readiness and CSP, Pro hiding the Free nudges, editions and the v2 claim pin; check-legal web-count and app-claim pins | dev | T3, T5, T6, T7 | done | tests/quota.test.ts, tests/sign-in.test.ts, tests/nudges.test.ts, tests/i18n.test.ts, scripts/check-legal.mjs, scripts/copy-rules.mjs |
| T10 | Docs: CLAUDE.md (editions, copy rules, sign-in per provider), PINS prose | dev | T9 | done | CLAUDE.md, docs/PINS.md |

## Status (2026-10-16)
Built on branch `feat/016-v2-claims`; `npm test` green (26 files, 262 tests, build, check-legal). A throwaway build with
`CONTRACT_1_12` on and Apple alone ready rendered the v2 copy in all 13 languages, the Apple button only, the Pro price
and queue lines, no "More cities" chip, and /privacy naming Apple alone; check-legal then failed only on Apple's missing
CSP host, as designed. ffly API 1.13.0 went live during the build (coordinator, 2026-10-16), so the pin is the published
`MetaResponse`, verbatim, and the web fixture is the live `/meta`.

Left:
- **Places snapshot**: live `/meta` `places_version` is `9fb3fa318e12f72e`, `public/places.json` and `web-meta.json` are
  still `e93bc417e214621a`, so first visits fetch `/places` from the API. `npm run places` refreshes both (it also keeps
  the window); not done here, to keep a 3,493-place data diff out of this change.
- Spec 014's owner items stand: `CONTRACT_1_12`, then each provider (`AUTH.appleRegistered`, `AUTH.googleClientId`)
  with its `PROVIDER_CSP` hosts in `vercel.json` in the same commit.

Deviations:
- `web-meta.json`'s `tier_limits` were set to the live values by hand (10, 12, 20), not by `npm run places`, for the
  reason above; `places_version` stays equal to `public/places.json`'s, as check-legal requires.
- The app-claim pin is check-legal's on a flag-on build (pages and the widget payload), plus a vitest over every
  language's v2 dictionary, since production builds with the flag off.
- `widget.upsellTitle`/`upsellBody` stay 1.0 only: under the flag the upsell already renders spec 014's
  `widget.offers` comparison, so they get no v2 key.
- /privacy's website sentence keeps naming both providers while sign-in is off (the page is unchanged today) and names
  the ready ones once it is on; the app-wide Apple and Google lines stay (ios-ffly spec 034).
- Beyond the inventory: support "How do I delete my data?" now opens "ffly works without an account; if you have one,
  you can delete it in the app's Settings", and `llms.txt` drops "no ads in the app" and says "No account needed",
  each false in v2.
- Shared helpers: `tests/contract/json-schema.ts` (the parity test's validator, reused), `scripts/copy-rules.mjs`
  (`APP_CLAIM`, `stringsOf`) and `scripts/sign-in.mjs` (`PROVIDER_CSP`, `readyProviders`).

## Acceptance Criteria
- [x] With the flag off, the built pages keep every 1.0 claim; the only changes are the limit lines (R1), the plural tip
      and the count-free English pages.
- [x] No English page or `llms.txt` states a web search count; with a window in `web-meta.json` the home FAQ states
      exactly its numbers.
- [x] With and without `searches_per_window`/`window_hours`, the quota note and spent line read as R1 (vitest).
- [x] The v2 edition of every language rewrites every claim key; English v2 has no app-cheaper or app-queue claim; the
      rotation has 6 tips in both editions; key parity passes.
- [x] Apple alone, Google alone, both and neither give the right `SIGN_IN`, buttons, scripts, CSP hosts and /privacy
      sentence; check-legal's readiness equals the site's (vitest).
- [x] A Pro `/meta` hides the strip, the queue line, the quota note and the city-limit notice (vitest on `quotaNote`
      and `proCaller`).
- [x] `CONTRACT_1_12` stays false and no id is set.
- [x] Consumer contract tests green against the 1.13.0 fixtures; `npm test` green.
- [x] Code review clean.
