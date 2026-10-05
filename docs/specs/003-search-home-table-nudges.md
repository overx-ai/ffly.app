---
id: 003
title: "ffly.app: search on the home page, a results table with booking links, app nudges, remembered choices, consent and ads, notifications, light/dark map"
status: done
created: 2026-10-05
updated: 2026-10-05
repo: ffly-site
release: ffly-1.1.0
tasks: [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12]
depends_on: []
conflicts_with: []
source: owner, 2026-10-05: "make search form better, remember user choices via cookies, especially from and back … site searches ask for notification … use table to display data … ensure search is also at home. clicking the search must slowly scroll home page to the section with the search, showing the app side and pushing it … nudge feature by feature … always nudge that in app prices are cheaper … stylish custom dropdowns for cities, no default browser shit … tune map so it switches for light/dark"; mockups approved 2026-10-05 (https://claude.ai/artifact/FAZ8S6XRa1aHWTPmDU9ETX) with one copy fix: "just state prices in app are often cheaper", with no technical details.
---

# 003 - Search on home, results table, app nudges

> **TL;DR**
> - The web search moves onto the home page under `#search`, next to an app panel that pushes the app.
> - Every form control is custom; there is no native browser UI.
> - Results show as a table:
>   - routes 1–3 have flights and partner Book links;
>   - routes 4 and later are locked with "Open in app".
> - Nudges toward the app run everywhere, one feature at a time.
> - Cookies remember From and Back to.
> - Google's consent message gates ads. The ads stay off until `ADSENSE_CLIENT` is set.
> - A browser notification fires when routes are ready.
> - The map follows light and dark mode.
> - Built on ffly API 1.3.0 (1B-bots#533).

## Design source
The approved mockups are on the canvas linked in `source:`. These boards are the reference for layout, copy and colours, in both schemes:
- Home (desktop and phone)
- Controls
- Results (desktop and phone)
- Map
- Nudge copy deck

Only Night-palette tokens are used (`global.css`).

## Requirements
1. **Search on the home page.**
   - A new `SearchForm.astro` component is used by both `/` (the `#search` section) and `/search`. The `/search` URL stays.
   - The hero "Search routes free" button and the header "Search" item scroll to `#search` in `scroll.ts`: a requestAnimationFrame ease-out over about 1200 ms (`SCROLL_MS`), instant under `prefers-reduced-motion`.
   - `#search` has a `scroll-margin-top` equal to the header height.
   - The right column is `AppSide.astro`: a navy panel holding the app screen mock, the rotating nudge with dots, the fixed price line and the store badge.
2. **Custom controls only.** No `<datalist>`, `type=date`, `<select>` or native number spinner.
   - **`combobox.ts`:** an ARIA 1.2 combobox with a listbox.
     - Keys: ↑/↓/Enter/Esc/Home/End.
     - Matches the prefix of a name or code, with top places first.
     - Multi-airport cities are grouped (row: city, country and airports, plus a mono code tag).
     - A pick becomes a chip.
     - The cap comes from `/meta` (4 on the web). A 5th pick shows the "Up to 8 cities in the app" nudge row.
   - **Travel window:** a two-month range popover. Past days are disabled; the weeks start on Monday (en-GB).
   - **Nights:** − / + steppers (at least / at most).
   - **App-only options** appear as locked chips: Flight hours, Direct flights only, More cities, Be there on a date, Skip a flight. Each chip swaps in its own nudge line.
3. **Remembered choices** (`prefs.ts`, first-party functional cookies, `SameSite=Lax; Secure`).
   - `ffly_from` and `ffly_back`: 365 days.
   - `ffly_cities`: 30 days.
   - Dates are never stored.
   - `ffly_nudge`: the rotation index.
   - Fill order: query string (`?from=&cities=&back=`, used by the app's share link), then cookies, then defaults.
   - A "remembered" tag shows on fields that a cookie filled.
4. **Results table** (`ResultsTable`, built from `<template>` with `textContent` only).
   - Columns: # · Route · Dates · Nights · Flights · Watch out · Total · Details.
   - Selecting a row expands it into leg rows: day · time · from→to with codes · carrier · stops · price · **Book**. Book uses the API `link` as-is with `rel="sponsored noopener"` and `target="_blank"`.
   - Red "Watch out" chips (the existing palette rule) mark stops, departures before 07:00 and late arrivals.
   - Locked rows (4 and later) are blurred and show "N cities · dates and flights in the app" and "Open in app".
   - On a phone the table becomes stacked rows.
   - The partner disclosure line sits under the table.
5. **Nudges** (`nudges.ts`; the copy lives in `app.ts`, never inline).
   - **Fixed line:** "Prices in the app are often cheaper." It names no sources, airlines or mechanics (owner rule).
   - **`app_hint`:** when present, "Same trip in the app: from €X, €Y less."
   - **Rotation**, one per page view, advanced by `ffly_nudge`:
     - flight hours;
     - skips the queue;
     - 3 full searches free;
     - share as a boarding pass;
     - up to 8 cities;
     - every trip saved.
   - The progress card always shows "In the app your search skips the queue."
6. **Notifications** (`notify.ts`).
   - On submit, a soft ask appears in the progress card ("Notify me" / "Not now"). Only "Notify me" calls `Notification.requestPermission()`.
   - When the job is done and `document.hidden`, a single `new Notification("Your routes are ready", …)` fires; clicking it focuses the tab.
   - The tab title becomes "(1) Routes ready · ffly" until the tab is visible again.
   - `# ponytail:` no service worker or web push, so the tab must stay open; add push if the share of open tabs is low.
7. **Consent and ads.**
   - When `ADSENSE_CLIENT` (in `app.ts`) is set, the layout loads Google's certified consent message (Funding Choices) and AdSense.
   - `AdSlot.astro` reserves fixed sizes (728×90, 300×250, 320×100) so nothing shifts, and renders nothing while the ID is unset.
   - `vercel.json` CSP adds the Google ad and consent hosts.
   - Privacy `#website` and `#web-search` are rewritten to cover the cookies above, ads after consent, notifications and partner booking links.
8. **API 1.3.0.**
   - `ffly-api.ts` types gain `app_hint`, the full legs on routes 1–3, `more_routes`, and the `app_only` / `web_unavailable` reasons.
   - The web stops sending priority, filters and schedule.
   - A new `docs/PINS.md` row: ffly API 1.3.0 ← 1B-bots#533.
9. **Map light and dark** (`RouteMap.astro`).
   - Sea, land, graticule, leg, pin, label, halo, note and fly colours become CSS custom properties.
   - Light: mist sea, white land, blue `#2251CC` legs, a navy fly with red eyes.
   - Dark: today's night set.
   - The "Always a night map" comment and the matching CLAUDE.md rule are updated.
10. **Home copy.** The `#plans` heading and blurbs change to "3 full searches free in the app; Pro for every trip after". The old "Free shows the trip, Pro fills in the boarding pass" goes.

## Tasks (TDD: each lands its failing test first)
| ID | Description | Status |
|---|---|---|
| T1 | Add `vitest` (devDependency; Node 20 has no type stripping) + `npm test` runs it before the build checks | done |
| T2 | `combobox.ts` matcher + keyboard state machine (unit) and component | done |
| T3 | Date-range popover + nights steppers (unit for range logic) | done |
| T4 | `prefs.ts` cookie read/write, TTLs, fill precedence query → cookie → default (unit) | done |
| T5 | `SearchForm.astro` shared by `/` `#search` and `/search`; `scroll.ts` (unit for easing + reduced motion) | done |
| T6 | `AppSide.astro` + `nudges.ts` rotation (unit) + copy in `app.ts` | done |
| T7 | Results table model (route/leg rows, warn chips, locked tail) (unit) + template render | done |
| T8 | `notify.ts` soft ask → permission → notification on hidden tab (unit with a fake Notification) | done |
| T9 | Consent + `AdSlot` gated by `ADSENSE_CLIENT`; CSP; privacy rewrite; `check-legal.mjs` assertions (no ad script without the ID, privacy facts, `#search` anchor) | done |
| T10 | API 1.3.0 types + PINS row; drop priority/filters from the web request | done |
| T11 | RouteMap light/dark tokens; CLAUDE.md rule update | done |
| T12 | Home `#plans` copy; Playwright pass at 390 and 1280 px in both schemes | done |

## Acceptance
- `npm test` green (vitest + build + `check-legal`).
- Header Search and the hero button scroll slowly to `#search`; reload keeps From and Back to.
- A search shows a progress card with the queue nudge and the notification ask; a hidden tab gets the notification.
- Results render as the table; routes 1–3 have Book links with the partner marker; 4+ are locked.
- No native picker UI anywhere on the form; the map switches with the colour scheme.
- No ad or consent script loads while `ADSENSE_CLIENT` is unset.
