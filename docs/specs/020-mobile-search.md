---
id: 020
title: "Very good search on phones"
status: done
priority: p1
created: 2026-11-05
updated: 2026-11-05
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
---

# 020 - Very good search on phones

> **TL;DR** — On phones the home title now sits over the route map with a big gold search button, cities and dates open in sheets, and results are compact cards with a sticky summary, sort and filters. Desktop stayed the same. Owner: check the keyboard and safe areas on a real iPhone.

## Requirements
Approved mockups: https://claude.ai/artifact/TGoTCGuyRWBnWaHY6gJiQF. Home option C. Phones are 760px and below unless stated; 1280px renders as today.

- **Hero:** title first, one short line, the map under it with its top fading into the page, a big gold "Search routes free" button that jumps to the form. The example price and its caveat leave the first screen and stay together further down the page. Store buttons move below the search.
- **Header:** logo, account, menu button; Search and Support sit in the menu.
- **Consent:** one slim row on phones so it never covers the search button (T-028).
- **Form:** one card of 52px rows: From, Back to, Cities to visit, Dates, Nights per city, Travellers. "Same as From" is never cut. Limit text and Options sit on a quiet row under Find routes.
- **City picker:** tapping a place field opens a full-screen sheet with the input at the top and options above the keyboard. Back closes it.
- **Dates:** bottom sheet with a fixed Done button, 44px days.
- **Searching:** a sticky summary, progress, and one quiet "Notify me when ready" button. No upsell and no legal text during the wait.
- **Results:** compact cards with route, total, dates and nights, and warning chips only when there are warnings, so about six fit on a phone. Best route has a gold border. The whole card opens it. Open legs show date, time, route, airline, stops, price, a 44px Book and the menu. Save and Share below. Legal note under the list.
- **Sticky summary:** route, dates, nights and Edit, which returns to the filled form.
- **Sort and filter:** bottom sheet. Sort by best match, lowest total, fewest stops. Hide routes with stops, hide late arrivals. "Show N routes". Client-side only, over routes already returned.
- **Platform:** `viewport-fit=cover`, safe-area insets, `dvh`, `(hover: hover)` guards, `enterkeyhint`, `autocapitalize="words"`, 44px coarse-pointer targets for Book, Details, calendar days, Apple button and link buttons.

## Architecture
- No new dependency. Existing `Combobox` and `RangePicker` stay; their root elements gain a phone sheet state. City lists get their height from `visualViewport`.
- Sheets reuse `<dialog>` where a new element is needed (sort and filter), extending `.library-sheet`.
- Sort and filter logic lives in a new DOM-free tested module, `src/scripts/route-view.ts`. `renderResults` draws its output.
- Copy keys: `home.subShort`, sort and filter labels, Done, Edit, Notify. All 13 languages, native wording, Polish and Russian plurals for the count.
- Reused hero map: `RouteMap.astro` stays the SVG, so dark mode follows the scheme.
- CLAUDE.md binds: no `<select>` or native date inputs, `textContent` and `<template>` only, CLS 0, one plain Book per leg, tracking never delays a click, no em dashes.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| Fullscreen combo inside a clipped or transformed parent | Sheet sized to the parent | Verify at 390; move any clipping off on phones | Audit |
| iOS scroll under a fixed sheet | Page moves behind sheet | Lock body scroll while open, restore position | Audit |
| Option tap on touch with `pointerdown` prevented | List cannot scroll or select | Test scroll, then tap | Explore |
| Filters hide every route | Empty screen | Show the empty note with Clear | Spec |
| A route opens, then the sort changes | Wrong row stays open | Keep open state by route key | Spec |
| Locked rows for free users | Sort reveals or breaks locked rows | Sort and filter only visible rows; locked rows stay last | Spec |
| Long German and Polish strings | Overflow | Check `/de`, `/pl`, `/ru` at 320 and 390 | T-029 |
| Search running when Edit is tapped | Lost or doubled search | Edit only scrolls; the form stays disabled as today | Spec |
| Rotation or resize with a sheet open | Sheet state on desktop layout | Close on crossing the breakpoint | Spec |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | Platform, hero, header menu, slim consent | dev | - | done | `src/layouts/BaseLayout.astro`, `src/views/Home.astro`, `src/components/Header.astro`, `src/components/ConsentBanner.astro` |
| T2 | Form rows, city sheet, dates sheet | dev | T1 | done | `src/components/SearchForm.astro`, `src/components/PlaceCombo.astro`, `src/styles/search.css`, `src/scripts/combobox.ts`, `src/scripts/calendar.ts` |
| T3 | Searching state, sticky summary, compact results, open legs | dev | T2 | done | `src/scripts/search.ts`, `src/styles/search.css` |
| T4 | Sort and filter sheet with tested module | dev | T3 | done | `src/scripts/route-view.ts`, `tests/route-view.test.ts` |
| T5 | Copy in 13 languages | dev | T4 | done | `src/i18n/*.ts` |

## Acceptance Criteria
- [x] At 390px the title, map and search button fit above the consent row with no scrolling.
- [x] A full search works end to end at 320, 390 and 430, light and dark, with no horizontal scroll or console errors.
- [x] All tappables on the search flow are at least 44px on touch.
- [x] About six route cards fit on a 390x844 screen.
- [x] 1280px home and search look the same as before.
- [x] `npm test` passes, including `check-legal` across 13 languages.
- [x] Code review clean.
