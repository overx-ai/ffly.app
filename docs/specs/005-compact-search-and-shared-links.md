---
id: 005
title: "Compact search, nights per leg, and shareable searches that open with results"
status: done
created: 2026-10-05
updated: 2026-10-05
repo: ffly-site
release:
depends_on: []
conflicts_with: []
tasks: [T1, T2, T3, T4, T5, T6, T7, T8]
source: owner, 2026-10-05 screenshots: "why no nights in table", "form is big and clumsy - app promo on the right makes it clumsier. show it dynamically, with some animation, use less space vertically for the form, so that search table is visible after user scrolls to the form, even if it's empty. add all search params to the url - so that they are shareable, cache on server the searches - so that new user opening it - will automatically open it with data"; owner decisions: links work until the trip start date; on miss prefill, user clicks
---

# 005 - Compact search, nights per leg, and shareable searches that open with results

> **TL;DR** - The leg rows show the nights spent at each stop. The form becomes a full-width, two-row bar; the app
> promo becomes a slim animated strip under it; the results table is always on screen. Every search parameter goes
> in the URL, and a shared link opens with the stored result (1B-bots spec 535) until the trip's first day, or only
> pre-fills the form when there is none.

## Requirements
1. **Nights per leg.** In a route's expanded legs, leg *i* shows the nights spent at its destination (`nights[i]`,
   the same numbers as the row's "4 · 2"), as "4 nights" through the existing plural `common.nights`. The last leg
   (the flight back) shows nothing.
2. **Compact form, full width.**
   - The app promo leaves the form's grid; the form takes the full width.
   - Desktop (≥ 900 px), two rows: From · Back to · Travel window · Nights (inline compact steppers), then the
     city chips and the add-city input stretching, with **Find routes** at the end.
   - One slim line below: the "In the app" locked chips (smaller, one line, scrolling sideways when narrow) and
     the free-search note on the right.
   - Hints become placeholders or visually hidden `aria-describedby` text.
   - Inputs are 40 px on desktop; touch targets stay 44 px under `(pointer: coarse)` and on narrow layouts.
   - At 1280×800, after the glide to `#search`, the form, the app strip and the results table header are in view.
   - Same on `/` and `/search`, in all eight languages.
3. **App strip.** A slim bar between the form and the results: app icon, a rotating nudge, the fixed "Prices in the
   app are often cheaper." line and a small store badge.
   - The nudge changes every 5 s with a CSS slide-up and fade; the first one still follows the `ffly_nudge`
     cookie, so each page view starts on the next tip.
   - Rotation pauses on hover or focus, while the tab is hidden and while the strip is off screen; it never runs
     under `prefers-reduced-motion`. Dots are buttons: picking one shows that tip, stops the rotation and is
     announced politely.
   - The strip slides in when `#search` comes into view (IntersectionObserver plus a class); it is simply shown
     without JavaScript or under reduced motion.
   - The phone "Trips" mock is dropped.
4. **Results always visible.** Before any search the results table shows its header and an empty state ("Your
   routes will appear here") over two placeholder rows; while a search runs the placeholders shimmer (static under
   reduced motion); results replace them.
5. **Every parameter in the URL.** `from`, `back`, `cities` (the app's share link) plus
   `dates=YYYY-MM-DD..YYYY-MM-DD` and `nights=min-max`. The form reads them from the query (then cookies, then
   defaults; dates and nights only from the query, invalid values fall back to defaults). On submit and when a
   stored result loads, `history.replaceState` writes the full query on the current language path, keeping
   `#search` on the home page. `back` is omitted when it equals `from`.
6. **Opening a shared link.**
   - Complete parameters (from, cities, dates, nights) with `date_from` today or later: look up the stored result
     (`GET /searches/shared`). A **hit** renders the results immediately with "Searched {date}" (the page's
     locale) and a **Search again** button that submits the form as usual. A **miss** (404, 405, network or CORS
     failure, an older API) only pre-fills the form; the visitor clicks to search, so no free search is spent
     without consent.
   - Past dates pre-fill the places and nights, and the travel window defaults forward.
   - The session's own search (sessionStorage resume) wins only when its request equals the URL's.
   - A finished or lost search that the API no longer has is looked up the same way before the "expired" message
     or the automatic re-run.
7. **Privacy.** `/privacy` `#web-search` (English, by category, no mechanics): web searches are stored without
   anything that identifies you, so anyone who opens the same search's link sees its result until the trip's first
   day; app searches are still deleted within 24 hours. Retention, the summary and the description say the same.

## Architecture
- **`src/scripts/results.ts`:** `LegRow.nights?: number`, `legRow(leg, f, nights)` with `route.nights?.[i]`.
  `search.ts` formats it with `common.nights`, which `SearchForm` adds to the `data-i18n` payload as `nights`
  (no duplicate string).
- **`src/scripts/prefs.ts`:** `fillPrefs(query, cookies, isPlace, limits?)` also returns `dates` and `nights`
  (`Filled`, query or default). `shareQuery(request)` builds the query string (commas kept readable),
  `shareUrl(path, request, hash)` the URL, `sharedRequest(prefs)` the complete request or `undefined`, and
  `sameSearch(a, b)` compares two requests by their share query.
- **`src/scripts/ffly-api.ts`:** `SearchView.searched_at?: string | null`; `lookupShared(request)` →
  `{ kind: 'hit', view } | { kind: 'miss' }`; `canLookup(request, today)` guards past dates. A hit is a finished
  result (rendered as it is, never polled or saved: after an API restart its id is gone) or an identical search still
  running (polled by id like the visitor's own, never re-run unasked). A 422 is a miss. Lists go as
  comma-separated values (`ends=WAW&cities=MAD,AMS`), the same as the site's own `cities` parameter.
- **`src/scripts/ticker.ts`:** a DOM-free rotation timer: `start`, `pause(reason)`/`resume(reason)` (hover,
  focus, hidden, offscreen), `show(i)` for a manual pick that stops it; no timer under reduced motion.
- **`src/components/AppStrip.astro`** replaces `AppSide.astro` (keeps `id="app-side"`, the target of the locked
  rows' "Open in app" and the "more routes" link). `t.appSide.trips` goes.
- **`SearchForm.astro` / `search.css`:** the new two-row grid, the slim app-only line, the strip between the form
  and the outcome, the results section without `hidden`, a static placeholder `tbody`, the "Searched" line and
  **Search again**. Ids the script uses stay.
- **`views/Home.astro`:** tighter `#search` padding and heading.
- **Strings** (`en.ts` and the 7 dictionaries, app wording from ios-ffly `Scripts/l10n` where it has one: "Search
  again", "Searched"): `widget.emptyState`, `widget.searchAgain`, `widget.script.messages.searchedOn`,
  `widget.script.nudges.dot`.
- **`docs/PINS.md`:** the lookup needs ffly API ≥ 1.5.0 (1B-bots spec 535); older APIs answer 404/405 → prefill.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| API without the lookup (404/405), CORS failure, timeout | Shared link shows nothing | Every non-200 or thrown fetch is a miss: the form is pre-filled | owner |
| Lookup with past dates | Wasted request, stale result | `canLookup` guard; past dates pre-fill places and nights, window defaults forward | owner |
| URL parameters malformed (bad date, `nights=5-2`, unknown city) | Broken form | Each parameter validated on its own; invalid ones fall back to cookie or default | plan |
| Window longer than the API allows, nights over the limit | 422 on submit | `fillPrefs` limits from `/meta` reject them | plan |
| sessionStorage holds another search than the URL | Wrong result shown | Resume only when `sameSearch(saved, url)`; otherwise the URL wins | plan |
| Shared hit reloaded | Second lookup | Not saved to sessionStorage, so a reload looks up again (cacheable for 5 min) | plan |
| Job lost after an API restart | "Expired" or a re-run spending quota | Lookup first; only a miss re-runs or shows "expired" | plan |
| Rotating text and WCAG 2.2.2 | Moving content without control | Pauses on hover/focus/hidden/offscreen; dots stop it; none under reduced motion | plan |
| Strip hidden without JS | No promo | The hidden state is only added by the script | plan |
| Layout shift when results arrive | Jumping page | Results section always present; placeholders replaced in place | owner |
| Long German/Polish labels in the compact grid | Overflow | Labels wrap; visual pass at 390 and 1280 px for `/de` | plan |
| Shared links reveal a trip | Privacy | Stored without anything that identifies the searcher; `/privacy` says so | plan |

## Cross-Repo Interfaces
- **Consumes 1B-bots spec 535** (ffly API 1.5.0): `GET {FFLY_API_BASE}/searches/shared?start=&ends=&cities=&date_from=&date_to=&min_nights=&max_nights=`
  → 200 `SearchView` (as `GET /searches/{id}`) plus `searched_at` (ISO datetime), 404 on a miss; no quota.
  List parameters are comma-separated. Fallback for anything else: pre-fill.
- Ships independently: before 535 is live every lookup is a miss.

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | Nights per leg: `LegRow.nights`, `.leg-nights`, `common.nights` in the widget payload | dev | - | done | src/scripts/results.ts, src/components/SearchForm.astro, src/styles/search.css, src/scripts/search.ts, tests/results.test.ts |
| T2 | URL parameters: `fillPrefs` dates and nights, `shareQuery`/`shareUrl`/`sharedRequest`/`sameSearch`, `replaceState` on submit | dev | - | done | src/scripts/prefs.ts, src/scripts/search.ts, tests/prefs.test.ts |
| T3 | `lookupShared`, `canLookup`, `searched_at`; PINS note | dev | - | done | src/scripts/ffly-api.ts, tests/ffly-api.test.ts, docs/PINS.md |
| T4 | Rotation timer `ticker.ts` | dev | - | done | src/scripts/ticker.ts, tests/ticker.test.ts |
| T5 | Compact full-width form and tighter `#search` heading | dev | - | done | src/components/SearchForm.astro, src/styles/search.css, src/views/Home.astro |
| T6 | App strip replacing AppSide, slide-in and rotation | dev | T4 | done | src/components/AppStrip.astro, src/components/AppSide.astro (deleted), src/scripts/search.ts, src/i18n/*.ts |
| T7 | Results always visible (empty state, placeholders, shimmer), shared-link open (hit/miss/past), Searched line, Search again, strings in 8 languages | dev | T1, T2, T3 | done | src/components/SearchForm.astro, src/scripts/search.ts, src/styles/search.css, src/i18n/*.ts |
| T8 | `/privacy` web-search storage copy and check-legal fact; CLAUDE.md notes; visual pass | dev | T7 | done | src/data/privacy.ts, src/data/support.ts, scripts/check-legal.mjs, CLAUDE.md |

## Acceptance Criteria
- [x] Expanded legs show "N nights" per stop; the flight back shows none.
- [x] At 1280×800 after the glide to `#search` the form, the app strip and the results table header are visible, in `/` and `/de`, light and dark; nothing overflows at 390 px.
- [x] The strip rotates every 5 s, pauses on hover/focus/hidden, and is static under reduced motion.
- [x] A search writes the full query to the URL; opening it with a stored result shows the results with "Searched {date}" and spends no free search; a miss or past dates only pre-fill.
- [x] `/privacy` `#web-search` describes shared web searches by category; check-legal asserts it.
- [x] `npm test` green (vitest, build, check-legal), `tsc --noEmit` clean.
