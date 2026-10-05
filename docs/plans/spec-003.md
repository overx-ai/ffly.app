---
item: docs/specs/003-search-home-table-nudges.md
kind: spec
status: done
created: 2026-10-05
updated: 2026-10-05
lane: dash
---

# Plan - Spec 003

> **TL;DR** - How spec 003 was built: one `SearchForm.astro` on `/` and `/search` over small DOM-free modules
> covered by vitest. Deviations below are binding until the owner overrides them; ads stay off, and the CSP
> gains the ad hosts only with `ADSENSE_CLIENT`.

## Approach
One search widget, `SearchForm.astro` (form + AppSide + progress + results + templates + the one bundled
script), rendered by `/` inside `<section id="search">` and by `/search` under its H1. Every piece of logic the
spec asks to unit-test lives in a small DOM-free module under `src/scripts/` (`combobox`, `calendar`, `prefs`,
`scroll`, `nudges`, `results`, `notify`, plus `ffly-api` request building), each taking its inputs (today, cookie
string, formatters, a fake `Notification`) as arguments so vitest runs them in plain Node. `search.ts` stays the
only DOM orchestrator. Rejected: a framework or web components for the controls (a second dependency, against
CLAUDE.md's "one dependency"; vitest is dev-only). Copy, cookie names/TTLs, scroll time, ad ids and sizes go in
`src/app.ts`.

## Sequence
1. T1 vitest + `npm test` = `vitest run && astro build && check-legal` (every later task needs the runner).
2. T10 API 1.3.0 types and `buildRequest` (results, form and outcomes depend on the wire shapes).
3. Pure modules with their tests, red then green: T2 combobox matcher/keys, T3 calendar range + nights, T4 prefs,
   T5 scroll, T6 nudges, T7 results model, T8 notify.
4. DOM: `SearchForm.astro`, `AppSide.astro`, `search.ts` rewrite, `search.css` rewrite; home `#search`,
   header/hero links (T5, T6, T7 render).
5. T9 ads/consent (`AdSlot`, BaseLayout loaders, CSP, privacy rewrite) and its check-legal assertions.
6. T11 map tokens; T12 `#plans` copy; CLAUDE.md, README, design doc, PINS.
7. `npm test` green.

## Files
| File | Change |
|---|---|
| package.json, package-lock.json | vitest devDependency; `test` runs it first |
| tests/*.test.ts | new: combobox, calendar, prefs, scroll, nudges, results, notify, ffly-api |
| src/scripts/ffly-api.ts | 1.3.0 types (legs, app_hint, reasons), `buildRequest` without priority/filters/schedule |
| src/scripts/combobox.ts | new: matcher, key state machine, `Combobox` DOM class (ARIA 1.2) |
| src/scripts/calendar.ts | new: Monday-first month grid, range pick, day state, nights stepper |
| src/scripts/prefs.ts | new: cookie parse/serialise, fill precedence query > cookie > default |
| src/scripts/scroll.ts | new: ease-out position, reduced-motion duration, `#search` link handler |
| src/scripts/nudges.ts | new: rotation index from cookie, app_hint line |
| src/scripts/results.ts | new: route/leg rows, warn chips, locked tail, safe Book link |
| src/scripts/notify.ts | new: soft ask, permission, notification on hidden tab, tab title |
| src/scripts/search.ts | rewritten orchestration on the modules above |
| src/components/SearchForm.astro | new: the shared widget + templates |
| src/components/AppSide.astro | new: navy panel, phone mock, rotating nudge + dots, price line, badge |
| src/components/AdSlot.astro | new: fixed-size slot, renders nothing while ids unset |
| src/components/Header.astro | "Search" item to `/#search` |
| src/components/StoreCtas.astro | "Search routes free" to `/#search` |
| src/components/RouteMap.astro | colour custom properties, light + dark sets |
| src/layouts/BaseLayout.astro | consent + AdSense loaders only when `ADSENSE_CLIENT` is set |
| src/pages/index.astro | `#search` section; `#plans` heading and blurbs |
| src/pages/search.astro | uses SearchForm |
| src/app.ts | NUDGES, APP_ONLY_OPTIONS, PREFS, SCROLL_MS, WEB_NOTIFY, ADSENSE_CLIENT, AD_SLOTS, AD_SIZES, warn hours |
| src/styles/global.css | `--navy-blue` primitive, `--header-height` |
| src/styles/search.css | rewritten for the widget (custom controls, table, stacked phone rows) |
| src/data/privacy.ts | `#web-search`, `#website` rewritten; ads bullets conditional on `ADSENSE_CLIENT` |
| scripts/check-legal.mjs | ads-off assertion, privacy facts, `#search` anchor; API-host copy ban keyed to the bundle |
| vercel.json | CSP Google ad + consent hosts |
| CLAUDE.md, README.md, docs/002-design-and-guides.md | dev dependency, JS on `/` and `/search`, light/dark map |
| docs/PINS.md | new: ffly API 1.3.0 row |
| docs/specs/003-search-home-table-nudges.md | task rows `done` |

## Tests first
- `combobox.test.ts`: name and code prefix match, case-insensitive; top places first; group members folded into
  their city; excluded codes dropped; limit. Keys: ArrowDown opens/advances and clamps, ArrowUp, Home/End only
  when open, Enter picks the active row, Esc closes, unknown keys pass through.
- `calendar.test.ts`: grid weeks start Monday and pad with the neighbouring months; past days disabled; first
  pick starts, second pick ends, a pick before the start or past the window restarts; in-range flags; nights
  stepper clamps 1..limit and drags the other bound.
- `prefs.test.ts`: cookie string has Max-Age, Path, SameSite=Lax, Secure; parse; per-field precedence query >
  cookie > default with unknown codes rejected; dates never part of the stored set.
- `scroll.test.ts`: ease-out endpoints and monotonic; position at 0, mid, end; reduced motion gives 0 ms.
- `nudges.test.ts`: rotation index from cookie, wrap-around, garbage resets; app_hint line only when cheaper.
- `results.test.ts`: rows 1-3 with legs, warn chips (stops, before 07:00, late), locked tail text, extra
  `more_routes` beyond the locked rows, `safeLink` refuses non-http(s).
- `notify.test.ts` (fake Notification/document): no ask without the API or once decided; requestPermission only
  via `ask`; nothing fires on a visible tab; one notification on a hidden tab, click focuses; tab title restored.
- `ffly-api.test.ts`: `buildRequest` sends no priority, filters or schedule; 503 `web_unavailable` and 422
  `app_only` map to their outcomes.

## Risks
- Astro 4 bundles a component's `<script>` even when the component renders nothing: the ad push therefore lives
  in `search.ts` and only acts on `ins.adsbygoogle`, which exists only when the ids are set.
- Bundle copy bans (`background`, `cache`, `server`, `up to 8`...) also scan minified JS: no style writes of
  `background`, no fetch `cache` option, no number in the city-cap nudge.
- API 1.3.0 is not deployed yet (1B-bots spec 533 is approved, contract still 1.2.0): every new field is
  optional, a route with places but no legs renders without Details, locked routes render locked.
- AdSense under a strict CSP may need more hosts than documented; verify in the console once the id is set.

## Deviations
- "Up to 8 cities in the app" nudge row reads "More cities in the app", and the rotation line "Add more cities to
  a trip in the app": `MECHANICS` in check-legal bans "up to 8" on every page and in the bundle (kept).
- Legal copy names "an advertising partner" and "a consent tool", never Google. The CSP gains the Google hosts (`AD_CSP` in check-legal) only in the change that sets
  `ADSENSE_CLIENT` (sweep review: no wider CSP before ads are on).
- Ads paragraphs in `/privacy` (summary, sharing, legal bases, website) are conditional on `ADSENSE_CLIENT`, so
  the published policy says "no ads" until the id is set, then describes ads after consent.
- `#2251CC` is the primitive `--navy-blue` at the top of `global.css` (a navy tint), used only by the light map.
- The combobox row shows city, airports and code; no country, because `/meta` places carry none.
- Multi-airport cities fold their member airports into one row; a member code still resolves from the query
  string, a cookie or a saved search.
- "Every trip saved" reads "Your trips are saved in the app": the app keeps `APP.savedTrips`, not every trip.
- Ad placement: one banner slot (728x90, 320x100 under 760 px) under the results; the 300x250 size is defined for
  a later placement. Ad unit ids live in `AD_SLOTS`, unset.
- The home `#plans` Pro line keeps CLAUDE.md's fixed "Every route in full, and no 3-search limit".
- The header item "Try on the web" became "Search" (`/#search`); `/search` stays reachable from guides, the
  sitemap and llms.txt.
- `check-legal` bans in copy only the connect-src hosts the search bundle calls (the API host), so adding
  Google hosts to `connect-src` does not ban an ad script tag once ads are on. The "up to 8" ban is untouched.
- `#search` gets `scroll-margin-top: var(--header-height)` (65 px, the sticky header), a new token beside
  `--header-offset`.
- "Watch out" chips are red (`--danger`) as the spec asks; CLAUDE.md's red rule now names them beside the stamp
  and errors.
- The hero web link became a gold "Search routes free" button in `StoreCtas` (hero, close band and guides), to
  `/#search`; the dead `--web-ink` hook went with it.
- `#plans` promise reads "No ads in the app." so it stays true once website ads are on; the home FAQ "Is ffly
  free?" answer follows the new Free copy.
- The travel window shows the default dates and the nights steppers their defaults before `/meta` loads.
- Left as they were, out of this spec's scope (flagged): Terms section 5 and `/support` still describe app Free as
  partly hidden and the web search as top-route-only, `BoardingPass` still blurs the Free view,
  `WEB_SEARCH.freeSearchesPerDay` stays 1 (API 1.3.0 makes it 5), and `llms.txt` and the guides repeat both.
