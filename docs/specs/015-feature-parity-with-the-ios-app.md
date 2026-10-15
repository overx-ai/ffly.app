---
id: 015
title: "Feature parity with the iOS app"
status: done
priority: p1
created: 2026-10-15
updated: 2026-10-16
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
source: META_STATE bridges/012-1b-bots-to-0e-extensions--ios-ffly.md
---

# 015 - Feature parity with the iOS app

> **TL;DR** - The web search got the iOS app's controls (trip type, travellers, must/maybe cities, skipped flights, date
> pins, connections, flight hours, airports, priority), saved routes, compare, history, share, visa flags and rating, in
> 13 languages. Each option is sent only while `/meta` allows it: travellers today, the rest once API 1.12.0 is live and
> spec 014 turns on `CONTRACT_1_12`.

**Related**: [001 - Free web search](001-search-web-app.md), [005 - Compact search and shared links](005-compact-search-and-shared-links.md),
[006 - Several back cities](006-clear-buttons-and-several-back-cities.md), [014 - Accounts, Pro and Trip kit offers on the web](014-accounts-pro-and-trip-kit-offers-on-the-web.md)
(the shared `CONTRACT_1_12` flag and the tracked analytics).

## Requirements
Founder, 2026-10-15 (bridge 012, approved). **The rule: the site has every feature the app has. Only the plan limits
differ, and those come from the server.** Copy rules: never "unlimited", never "cheapest guaranteed", never name where
fares come from.

**The search form** (ffly API 1.12.0 lets the web send these; until then they stay hidden behind the flag)
- R1 **Must and maybe cities**: each city chip toggles must or maybe; maybe codes go in `optional`.
- R2 **Skip a flight**: a leg's ⋯ menu adds it to `excluded` (`ExcludedFlight`: `source`, `origin`, `dest`, `day`,
  `dep`, taken from the leg), an exclusions bar lists the skipped flights with **Undo**, and the search runs again.
- R3 **Be there on a date**: pin a stop to a day or range inside the window (`pinned`: `city`, `date_from`, `date_to`).
- R4 **Direct flights only** (`max_stops_per_leg: 0`) and **max connections per trip** (`max_stops_total`), as the
  app's `Template/Core/Models/TripFilters.swift`.
- R5 **Flight hours**: earliest takeoff and latest landing (`schedule.short_from`, `schedule.short_to`); the long-leg
  fields keep the API defaults.
- R6 **Airport choice per city** for a place with several airports (`airports`: city code to the chosen codes from
  `Place.airports`; all of them by default).
- R7 **"What matters most?"** (`priority`): best schedule, balanced or cheapest, from `/meta` `priorities` and
  `default_priority`.
- R8 **Travellers**: adults, children, infants (`travellers`; the server already allows it, the site never sends it).
- R9 **Trip type**: one-way, round trip or multi-city, mapped as the app's
  `Template/Features/Search/SearchFormModel.swift`: round trip is `cities: [destination]`, `ends: [start]`; one-way is
  `cities: []`, `ends: [destination]` (API 1.10.0); multi-city is today's form.

**After results**
- R10 **Saved routes** (up to 50), **compare** 2 or 3 of them side by side, and **history** (up to 20 searches), in
  `localStorage` for now; syncing across devices comes later, with accounts.
- R11 **Share** each route: at least the link and the itinerary text; the boarding-pass image is optional.
- R12 **Visa flags by passport**: port the app's MIT-licensed Passport Index data and rules from ios-ffly
  `Template/Core/Services/VisaRules.swift` (data `Template/Resources/visa_requirements.json`, ios-ffly spec 029).
  Passports stay on the device and are never sent.
- R13 **Route rating**, as the app's `Template/Features/Results/SearchRatingRow.swift`.

**Everywhere**
- R14 All 13 site locales.
- R15 The locked chips in `src/i18n/en.ts` `widget.appOnly` (Skip a flight, Be there on a date, Direct flights only,
  Flight hours) become the real controls of R2-R5. "More cities" stays: it is a plan limit (spec 014 owns its copy).

## Architecture
- **Gate per field, from the server.** A control shows when `CONTRACT_1_12` (in `src/app.ts`, shared with spec 014) is
  on **and** its request field is absent from `/meta` `tier_limits.app_only_fields`. Today's API (1.11.0) lists
  `excluded`, `pinned`, `max_stops_per_leg`, `max_stops_total`, `schedule`, `optional`, `airports` and `priority` there
  for the web, so the controls stay hidden even with the flag on. `travellers` and the trip type are not app-only
  (API 1.11.0 and 1.10.0) and ship without waiting for 1.12.0.
- **One request model.** `buildRequest` in `ffly-api.ts` grows from the trip-only request to the full `SearchRequest`,
  sending a field only when the visitor set it, so a default search is byte-identical to today's. Its "the web sends
  the trip only" comment and CLAUDE.md's "Never priority, filters or schedule" are rewritten.
- **Contract limits, not plan limits.** Schema caps (`pinned` 5, `excluded` 50, `max_stops_per_leg` 3,
  `max_stops_total` 6, adults plus children 9, infants at most one per adult) live in one `REQUEST_LIMITS` object in
  `src/app.ts`; the contract test asserts they equal the pinned schema. Plan limits (cities, ends, searches) come only
  from `/meta`.
- **Shared links.** `shareQuery` and `sharedRequest` in `prefs.ts` round-trip every new field in readable form
  (comma lists, as today), and `lookupShared` passes them. Old links keep working; no new cookie.
- **Controls.** Custom controls only (no `<select>`, `<datalist>`, date, time or number input), as CLAUDE.md requires:
  steppers for travellers and connections, the existing calendar for pins, a time list for flight hours. Advanced
  controls sit in an "Options" panel, closed by default, so the first paint and layout stay as today (CLS 0).
- **Library.** `src/scripts/library.ts` (DOM-free, tested): saved routes (newest first, one per distinct route, oldest
  dropped past 50), history (past 20), compare (2 or 3), passports and ratings. Each entry keeps the full route snapshot,
  not just a search id, because web results expire at the trip's first day. Keys and caps in one `LIBRARY` object in
  `src/app.ts`; every storage access goes through try/catch, like the existing `storage()` helper in `search.ts`.
- **Share.** `src/scripts/share-text.ts` (DOM-free, tested) ports ios-ffly `Template/Features/Share/RouteShareText.swift`;
  the button uses `navigator.share` with the link (`shareUrl`) and the text, else copies them to the clipboard.
- **Visa.** `src/scripts/visa.ts` (DOM-free, tested against the app's cases) ports `VisaRules.swift`: the Schengen zone,
  a generic flag on every connecting leg, and "Visa: <country>" on a stay city that needs one for every chosen passport.
  The data ships as `public/visa.json` with its MIT notice beside it, fetched only once a passport is set, never in the
  JS bundle (it is about 105 KB). Copy follows the app: "may need a visa", never a promise.
- **Rating.** 1 to 5 stars per finished search, settled once given (kept in `library.ts`), sent only as a GA4 event
  through spec 014's `track()` after Accept; low stars link to /support.
- **Copy.** Shared terms (priorities, Book, plan names) come from ios-ffly `Scripts/l10n/{lang}.json`. The nudge "Choose
  the hours you like to fly, in the app." leaves the rotation once flight hours ships. `MESSAGES.appOnly` stays for the
  fallback below.
- **Privacy.** /privacy `#website` adds one sentence: saved routes, history, passports and ratings stay in your
  browser's storage and are never sent to us. check-legal asserts it, as it does the language choice (spec 012).

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| The 1.11 API refuses the new fields (422 `app_only`) | search fails | the flag and the per-field `app_only_fields` gate hide them; if a stale `/meta` still lets one through, drop the refused fields, say "That option isn't on the web yet", keep the form filled | founder |
| `localStorage` full (QuotaExceededError) or disabled (private mode, blocked site data) | nothing saved | try/catch on every access; history evicts oldest first; saving says it couldn't save in this browser; the search itself is unaffected | founder |
| A shared link carries the new fields | the receiver's site or API may not know them | `sharedRequest` reads what it knows; a hidden field is still kept and sent only once its control is allowed; a lookup miss only pre-fills, never spends a search unasked (spec 005) | founder |
| A shared link has more cities than the visitor's plan allows | over the cap | pre-fill, show the city-limit upsell, don't submit | spec 006 |
| Skipping a flight re-runs the search | may spend a free search | Undo restores the previous result from memory without a new search | analysis |
| `ExcludedFlight.source` names a fare source | confidential source shown | echoed back to the API as received, never rendered or logged | founder copy rule |
| Visa data out of date | wrong flag | the app's wording ("may need a visa", check entry rules); /terms already makes entry requirements the traveller's responsibility | ios-ffly 029 |
| MIT licence of the Passport Index data | licence breach | the MIT notice ships with `public/visa.json` | analysis |
| A saved route outlives its stored result | dead "open" link | the library keeps the full snapshot and offers "Search again" | analysis |
| Many controls crowd the form at 320 px | broken layout | the closed "Options" panel; checked at 320, 390 and 1280 px in both colour schemes | CLAUDE.md |
| A cap or limit phrase lands in copy ("up to 8") | `MECHANICS` ban fails | caps come from `/meta` and `REQUEST_LIMITS` at runtime; controls disable at the cap rather than state it | CLAUDE.md |

## Cross-Repo Interfaces
| Direction | Contract | Pinned version | Owner repo/spec | Fallback until available |
|-----------|----------|----------------|-----------------|--------------------------|
| consumes | the web may send `optional`, `excluded`, `pinned`, `max_stops_per_leg`, `max_stops_total`, `schedule`, `airports`, `priority` (gone from the web's `tier_limits.app_only_fields`); `/searches/shared` matches on them | 1.12.0 | 1B-bots spec 574 | `CONTRACT_1_12` false and the per-field gate: controls hidden |
| consumes | one-way trips and ends in visited cities | 1.10.0 | 1B-bots spec 568 | live today |
| consumes | `travellers` on a search, carried into booking links | 1.11.0 | 1B-bots spec 570 | live today |
| consumes | ios-ffly `VisaRules.swift` and `visa_requirements.json` (MIT Passport Index), ported | ios-ffly spec 029, 2026-10-12 | ios-ffly | the site's copy in `public/visa.json`, re-ported when the app's changes |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | `docs/PINS.md` rows for 1.10.0, 1.11.0 and the 1.12.0 web fields; fixtures; contract tests that `buildRequest` emits each field in the pinned schema's shape and that `REQUEST_LIMITS` equals its caps | dev | - | done | docs/PINS.md, tests/contract/ffly-api-parity.test.ts, tests/fixtures/ffly-api-1.12/*.json |
| T2 | Request model: trip type mapping, every R1-R8 field, validation as the API's, the per-field gate, `REQUEST_LIMITS`, `CONTRACT_1_12` if spec 014 has not added it; share-link round-trip | dev | T1 | done | src/scripts/ffly-api.ts, src/scripts/prefs.ts, src/app.ts, tests/ffly-api.test.ts, tests/prefs.test.ts |
| T3 | Form controls R1, R3-R9 in the "Options" panel; the four locked chips retired | dev | T2 | done | src/components/SearchForm.astro, src/scripts/search.ts, src/styles/search.css |
| T4 | Skip a flight: leg ⋯ menu, exclusions bar, Undo, re-run | dev | T2 | done | src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css |
| T5 | Library: saved routes, history, compare (`library.ts`, tested) and their UI | dev | T2 | done | src/scripts/library.ts, src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css, src/app.ts, tests/library.test.ts |
| T6 | Share: `share-text.ts` (tested) and the share button | dev | T5 | done | src/scripts/share-text.ts, src/scripts/search.ts, tests/share-text.test.ts |
| T7 | Visa flags: port rules and data with the MIT notice, passports UI, tests mirroring the app's | dev | T5 | done | src/scripts/visa.ts, public/visa.json, public/visa-LICENSE.txt, src/scripts/search.ts, tests/visa.test.ts |
| T8 | Route rating: stars, settled state, consented event, support link for low stars | dev | T5 | done | src/scripts/library.ts, src/scripts/search.ts, src/components/SearchForm.astro |
| T9 | Copy in 13 languages; nudge rotation revised | dev | T3, T4, T5, T6, T7, T8 | done | src/i18n/{en,de,fr,es,it,nl,pl,pt,ru,sv,da,nb,fi}.ts |
| T10 | /privacy `#website` sentence and its check-legal assertion; CLAUDE.md (search widget rules), README | dev | T9 | done | src/data/privacy.ts, scripts/check-legal.mjs, src/site-pages.ts, CLAUDE.md, README.md |

## Acceptance Criteria
- [ ] Against API 1.11.0 the form shows travellers and trip type only; every other new control is hidden, and a default search sends the same request as today.
- [ ] Against 1.12.0 fixtures with `CONTRACT_1_12` on, each of R1-R7 shows, sends its field in the pinned shape, and round-trips through a shared link.
- [ ] Skip a flight, Undo and the exclusions bar work on a finished search; Undo spends no search.
- [ ] Saved routes cap at 50, history at 20, compare takes 2 or 3; with storage disabled or full the search still works and says what it couldn't save.
- [ ] Share opens the system sheet or copies the link and itinerary text.
- [ ] Visa flags match the app's on its test cases; no passport leaves the browser (network log); `visa.json` loads only after a passport is set.
- [ ] Every new string exists in all 13 locales; no limit, cap or source name is a literal in copy; `npm test` green.
- [ ] Code review clean.
