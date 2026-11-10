---
id: 004
title: "A typed destination is refused unless it is picked from the list"
status: fixed
priority: p1
severity: high
created: 2026-11-10
updated: 2026-11-10
source: owner (phone screenshot)
repo: ffly-site
files: src/scripts/combobox.ts, src/scripts/search.ts, src/components/SearchForm.astro, src/styles/search.css, src/i18n/*.ts, tests/combobox.test.ts
---

# 004 - A typed destination is refused unless it is picked from the list

> **TL;DR** — On a phone, a user typed "Dush" for To and pressed Find routes. The list did offer Dushanbe, but the search failed with "Choose where you go from the list.", because submit accepted only an exact code or a full name. A place field now also accepts text that matches exactly one place. In the same fix, the one-way date field on phones reads "Leave between" instead of "Dates".

## Symptom
The owner's report from ffly.app on a phone: One way, Warsaw → "Dush", Find routes. Result: the red "Choose where you go from the list." The date field also read "Dates · Tue 1 Dec – Tue 8 Dec", which looked like a return date on a one-way trip.

## Root cause
`resolvePlace` (in `src/scripts/search.ts`) turned typed text into a place only when the text was an exact code or an exact full name. Nothing picked a suggestion on blur, on Done in the phone sheet, or on submit. So "Dush" stayed unresolved even though the list showed exactly one match. From and Back to behaved the same way.

The dates are not a bug. They are the flexible travel window: by default 21 days out, 7 days wide, for every trip type. The phone label "Dates" made that window read like a return date.

## Fix
- `resolvePlace(places, raw, lang)` now lives in `src/scripts/combobox.ts` as a pure function. It tries the exact code, then the exact name, then `matchPlaces`, and **accepts only a single match**. Several matches stay an error, so text that matches more than one place is never silently picked.
- The change handlers already write the resolved name back, so the field turns into "Dushanbe" before the search runs.
- Phones: when One way is selected, the window field's label reads `widget.leaveBetween` ("Leave between", in all 13 locales). CSS switches it on `#search-fields[data-trip="oneway"]`. The wide label "Travel window" is unchanged.

## Regression test
`tests/combobox.test.ts`, the `resolvePlace` tests, run against the real `public/places.json`:
- "Dush" gives DYU. This failed before the fix.
- "dyu" and "Dushanbe" give DYU.
- "Sant" (26 matches), "" and nonsense give nothing.
