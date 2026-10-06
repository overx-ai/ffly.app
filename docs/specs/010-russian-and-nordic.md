---
id: 010
title: "Russian and the Nordic languages, clean canonicals, and city search by local name and every code"
status: done
created: 2026-10-07
updated: 2026-10-07
repo: ffly-site
release:
depends_on: [009]
conflicts_with: []
tasks: [T1, T2, T3, T4, T5, T6]
source: owner, 2026-10-07 (plan good-now-fully-localize-encapsulated-bentley)
---

# 010 - Russian and Nordic languages, local city names

> **TL;DR** - Five languages joined the eight: ru, sv, da, nb (at `/no`) and fi, 13 in all. City search finds a city by
> the page language's name, its own local name (Warszawa on `/en`), its English name and every code, as the app does;
> a city with several airports is labelled "All airports" in the suggestions, never once chosen. Cyrillic gets Onest
> and IBM Plex Mono's Cyrillic faces, fetched only by a page with Cyrillic text. A new site language changes the
> stored place list and the static URL, so returning visitors get the new names.

## Cross-Repo Interfaces
| Direction | Interface | Repo / spec | Fallback |
|---|---|---|---|
| consumes | ffly API `GET /places` names in 49 languages, ru, sv, da, nb, fi among them | 1B-bots spec 539 | A missing name falls back to the English `name`. |
| consumes | ios-ffly `Scripts/l10n/{ru,sv,da,nb,fi}.json` shared terms (plans, Book, priorities, "Airports") | ios-ffly | None: taken verbatim. |

## Requirements
1. **T1 Languages.** Five rows in `src/i18n/locales.ts`, same field order (`code, prefix, hreflang, tag, og, name`):
   ru `/ru` `ru` `ru` `ru_RU` Русский; sv `/sv` `sv` `sv` `sv_SE` Svenska; da `/da` `da` `da` `da_DK` Dansk;
   Norwegian code `nb`, prefix `no`, hreflang `nb`, tag `nb`, og `nb_NO`, Norsk (the API's names are keyed `nb`);
   fi `/fi` `fi` `fi` `fi_FI` Suomi (bare tags, as the de...pl rows). Full `satisfies Dict` dictionaries in `src/i18n/{ru,sv,da,nb,fi}.ts`, in `DICTS`.
   Russian plurals one, few, many, other. Every copy rule in every language (no em dash, never "unlimited", cities
   nominative). `UNLIMITED` in `check-legal` gains each language's terms. `tests/i18n.test.ts`, `public/llms.txt`,
   CLAUDE.md, README and `docs/002` follow the count.
2. **T2 Canonicals.** `check-legal` already proves self-canonical pages, the full reciprocal hreflang cluster plus
   x-default, the same set in the sitemap and no alternates on English-only pages, for every `LANGS` row. Added:
   no two rows share a code, prefix, hreflang, tag or og; each localized page's `og:locale` is its own row's and its
   `og:locale:alternate`s name every other row once; every footer switcher lists `LANGS` in order, each link the
   canonical URL of its page (the same page where it is localized, else that language's home).
3. **T3 Local names.** `scripts/places.mjs` and the page share `withLanguages` (`src/scripts/local-names.mjs`): a
   place keeps the site's languages of the API's names and, as `local`, its name in its country's main language
   (`COUNTRY_LANG`, only countries whose language the API names places in) when that language is not one the site
   keeps and the name is not the English one. `localOf` reads `local`, else the kept name in that language.
   `matchPlaces` matches it with the same ranks and once-per-list folding, within the keystroke budget. A suggestion
   row shows the page's name, then the English and the local name (with its `lang`) where they differ.
4. **T4 All airports.** `widget.script.allAirports` in every dictionary ("All airports", the app's "Airports" noun in
   each language). A suggestion row for a city with more than one airport (`optionParts`, the app's
   `hasAirportChoice`) shows the label before its codes; never a single-airport city, an airport row or the chosen
   field. `check-legal` fails on an empty widget string.
5. **T5 Places cache follows the languages.** `PLACES_LANGS` (the `LANGS` codes, comma-joined) marks the stored list
   and the static URL, `/places.json?v={version}&l={PLACES_LANGS}`. A stored list without the mark or with another is
   ignored and replaced by one fetch; a list at `/meta`'s version and these languages is never fetched again (spec 009
   T3 unchanged). `check-legal` asserts the bundle builds the `&l=` URL.
6. **T6 Cyrillic fonts.** Onest (variable, declared 400-800) `cyrillic` and `cyrillic-ext` follow Bricolage and
   Figtree in `--font-display` and `--font-body`; IBM Plex Mono 400, 500, 600 `cyrillic` and `cyrillic-ext` faces sit
   under its family name. Google's `unicode-range`, `swap`, no preload; `scripts/fonts.py` downloads missing files.
   The footer names a language in another script than the page's (Русский on `/de`) in the system font, so a Latin page
   never fetches Onest. `check-legal` fails on an `@font-face` file missing from the build.

## Edge cases
- A city whose local language the site keeps (Warszawa once `pl` is kept, Москва once `ru` is) needs no `local`: the
  kept names hold it, and `localOf` finds it through `COUNTRY_LANG`.
- `GOT` is "Goteborg (Landvetter)" in the API, with no English "Gothenburg": "Göteborg" finds it, "Gothenburg" does
  not. Copenhagen stands in for the Nordic test ("København" and "Copenhagen" both find CPH).
- A visitor with a list stored before this spec: ignored once, replaced by the static file, never fetched again after.
- A stored list that cannot be replaced (storage full): ignored on each visit, the HTTP cache answers the static URL.

## Verification
- T2-T6 (2026-10-07, with the eight current languages): `npm test` (vitest 159 tests, build, `check-legal`) and
  `tsc --noEmit` green. Each new test and `check-legal` assertion seen failing first (the latter on a tampered build).
  Headless Chromium on `astro preview`: `/`, `/de`, `/search`, `/pl/search`, `/support`, and `/de` with a Русский
  switcher link added, fetched no Onest or Cyrillic file; `/` with Cyrillic text fetched `onest-cyrillic.woff2` and
  rendered it in Onest (headings and body) and IBM Plex Mono (code). "War" on `/search` suggested
  "Warsaw Warszawa · Poland, All airports · WAW · WMI"; "Москва", "Praha" and "København" found MOW, PRG and CPH;
  the chosen field showed the name only.
- T1 (2026-10-07): the five rows and dictionaries in; `npm test` 160 tests, build, `check-legal` ok with 13 languages;
  all 39 localized pages scanned at 360 px for overflow (Russian `/search` heading fixed); `/ru` fetches the Cyrillic
  faces, `/fi/search` and `/no` none; "москва" and "Warsaw" on `/ru/search` find MOW and WAR with "Все аэропорты".
