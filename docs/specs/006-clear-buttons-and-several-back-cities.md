---
id: 006
title: "Clear buttons on place fields, several Back to cities, a visible picked range in dark mode"
status: done
created: 2026-10-05
updated: 2026-10-05
repo: ffly-site
release:
depends_on: []
conflicts_with: []
tasks: [T1, T2, T3, T4, T5, T6]
source: owner, 2026-10-05: "add clear button for all such. we must be able to select several back cities", "select dates are not clearly seen on dark mode", "only 2 back cities in web"
---

# 006 - Clear buttons on place fields, several Back to cities, a visible picked range in dark mode

> **TL;DR** - Every place field (From, Back to, Add a city) gets an × that empties it. Back to becomes a chip list
> like Cities, capped by the API's `tier_limits.max_ends` (2 on the web once 1B-bots spec 535 T8 ships; 1 today, when
> the field behaves exactly as before). The days inside a picked travel window get their own colour token so they
> read clearly in dark mode.

## Requirements
1. **Picked range in dark mode.** In-range calendar days use a new semantic token `--range`: light `--navy-fill`
   (unchanged), dark `--navy-dusk` `#1A3888` (half `--navy-blue` into `--navy-raised`, a primitive), a shade of the icon's navy blue: gold is never darkened. Declared
   on bare `:root`, overridden in the dark media block. The plan's `color-mix(gold 24%, navy-raised)` renders as a
   neutral grey `#464444` (gold and navy nearly cancel), so the visual pass chose the true shade: 10.2:1 for day numbers. Start and end stay solid gold; hovering an unselected day
   keeps `--fill`. Day numbers keep at least 4.5:1 contrast against `--range`.
2. **Clear button on every place field.**
   - `PlaceCombo` renders `<button type="button" class="combo-clear">` (an × icon) after the input, labelled
     `widget.clear` (new, 8 languages).
   - Visible only while the input has text, in pure CSS (`input:placeholder-shown ~ .combo-clear { display: none }`).
   - One delegated click handler: empties the input, runs the same path as emptying it by hand (the pick and the
     Remembered tag go), closes the listbox and returns focus to the input.
   - 44 px touch target under `pointer: coarse` and on narrow layouts.
3. **Several Back to cities.**
   - Cap: `endLimit(meta) = min(meta.tier_limits.max_ends ?? 1, meta.limits.max_ends)`.
   - Cap 1 (the API today): one text field, picking replaces, no chips, no count, no hint. Exactly as before.
   - Cap > 1: picks become chips (`ul#ends`, the same chip template and render code as Cities) kept in the order
     picked; only a pick adds one (leaving the field never does); the label shows "{n} of {max}"; at the cap the
     input is hidden and focus moves to the last chip, removing a chip brings it back. The
     label reads "Back to (any of)" from 2 picks; the visible hint "You can pick more than one place to finish, and
     ffly picks the cheapest." shows. An empty list means "same as From".
   - Exclusion (the app's `SearchFormModel`): an end cannot be a city to visit and vice versa; From may be an end.
   - Request: `Trip.ends: string[]`; `buildRequest` sends `ends`, or `[start]` when empty.
   - URL and cookie: `back=WAW,VNO` comma-separated like `cities`; a single `back=WAW` (old links, the app's share
     link) still parses. `back` is omitted when the ends are empty or just From. The `ffly_back` cookie stores the list.
   - Results line: "…, back to Warsaw or Vilnius", the "or" from `Intl.ListFormat(lang, { type: 'disjunction' })`.
4. Copy from the app's `Localizable.xcstrings` ("Back to (any of)", the hint); "Clear" has no app string and is
   translated here. Every copy rule holds (no em dash, no "unlimited", no mechanics, no carriers).

## Architecture
- **`src/scripts/places.ts`** (new, DOM-free): `addPlace(list, code, max)` (refuses a duplicate or a full
  list; replaces when the cap is 1; `search.ts` refuses a code from the other list with the overlap error) and `removePlace(list, code)`.
- **`src/scripts/ffly-api.ts`:** `Meta.tier_limits.max_ends?: number`, `endLimit(meta)`, `Trip.ends: string[]`,
  `buildRequest` sends `ends.length ? ends : [start]`.
- **`src/scripts/prefs.ts`:** `Prefs.back: Filled<string[]>` read with the list reader; `finishOf(request)` (the
  ends, or none when they are just the start); `shareQuery` writes `back` from it, `sameSearch` follows;
  `savedCookies({ start, ends, cities })` stores the list; `sharedRequest` sends the query's ends or `[from]`.
- **`src/scripts/search.ts`:** one chip-list descriptor `{ chips, input, count, max, exclude, remembered }` for
  `cities` and `ends`, one render and one remove path; the Back to combobox picks through `addPlace`; one delegated
  `.combo-clear` handler; the trip line joins the finish with a disjunction list.
- **`src/components/PlaceCombo.astro`:** the clear button (`clear` prop). **`SearchForm.astro`:** `#ends` chips,
  count, both label variants (`w.back`, `w.backAny`) and the `#ends-hint` line.
- **`src/styles/global.css`:** `--navy-dusk`, `--range`. **`search.css`:** `.combo-clear`, `.place-box` (was
  `.city-box`), `.in-range` on `--range`; while Back to holds chips the trip row aligns to the top and, on phones,
  From and Back to take full rows; `#ends-hint` spans the trip row right after Back to.
- **Strings** (`en.ts` and 7 dictionaries): `widget.clear`, `widget.backAny`, `widget.backMany`.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| API still says `max_ends: 1` | Several ends would be 422 `app_only` | Cap read from `/meta`; with 1 the field is the old single input | owner |
| `/meta` without `tier_limits.max_ends` (older API) | Unknown cap | Defaults to 1 | plan |
| Link with `back=WAW,VNO` while the cap is 1 | Request the API refuses | The form keeps the first; the lookup still tries the full trip (a miss pre-fills) | plan |
| An end that is also a city to visit | 422 overlap | Each picker excludes the other list; `readForm` still reports overlap | app |
| Ends `[From]` | Same trip as empty | `finishOf` treats it as no finish; URL omits `back`, cookie cleared | plan |
| Ends `[From, X]` | A real choice | Kept as is in the request, URL and trip line | app |
| Text typed in Back to but not picked | Lost choice | Resolved by name on submit, else the "Choose where you come back to" error | plan |
| Clear on From | Remembered cookie value | Clears the pick and the tag; the cookie is rewritten on the next search, as when typing | plan |
| Dark range colour | Palette rule | A navy shade primitive (`--navy-dusk`), `--range` declared on `:root` with a dark override; gold never darkened | owner |

## Cross-Repo Interfaces
- **Consumes 1B-bots spec 535 T8** (ffly API contract 1.5.0, value change only): web `/meta`
  `tier_limits.max_ends = 2`; a web POST with up to 2 `ends` is 202, a 3rd is 422 `app_only` (field `ends`).
- **Fallback:** today's API reports 1 (or nothing): the site keeps a single Back to and ships independently.
- **ios-ffly:** wording from `Template/Localization/Localizable.xcstrings`; rules from `SearchFormModel`.

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | Spec | dev | - | done | docs/specs/006-clear-buttons-and-several-back-cities.md |
| T2 | Tests first: chip rules, `back` list in prefs and share links, `buildRequest` ends, `endLimit` | dev | T1 | done | tests/places.test.ts, tests/prefs.test.ts, tests/ffly-api.test.ts |
| T3 | `--range` token for the picked window | dev | - | done | src/styles/global.css, src/styles/search.css |
| T4 | Clear button on `PlaceCombo`, delegated handler, `widget.clear` in 8 languages | dev | - | done | src/components/PlaceCombo.astro, src/components/SearchForm.astro, src/scripts/search.ts, src/styles/search.css, src/i18n/*.ts |
| T5 | Back to chip list: `places.ts`, `ffly-api.ts`, `prefs.ts`, `search.ts`, markup, strings | dev | T2 | done | src/scripts/places.ts, src/scripts/ffly-api.ts, src/scripts/prefs.ts, src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css, src/i18n/*.ts |
| T6 | `npm test`, `tsc`, Playwright pass at 1280 and 390, light and dark, `/` and `/de`, caps 1 and 2 | dev | T3, T4, T5 | done | - |

## Acceptance Criteria
- [x] In dark mode the days between the picked start and end read clearly at 1280 and 390; day numbers ≥ 4.5:1.
- [x] The × shows only while a place field has text, and clears it (and the pick) with focus back in the field.
- [x] With `/meta` `tier_limits.max_ends: 2`: two Back to chips go into the request and the URL (`back=A,B`), the
      label reads "Back to (any of)", the hint shows, a third is refused (the input is gone, "2 of 2").
- [x] With `max_ends: 1`: Back to behaves as before (one value in the field, no chips, no hint).
- [x] Old `back=WAW` links still work; `npm test` green, `tsc --noEmit` clean.
