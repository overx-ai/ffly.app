# ffly-site

Website for **ffly**, at `ffly.app`. Astro 4, static, one dependency (plus `vitest`, dev only). Zero client
JavaScript, except the free web search widget on `/` (`#search`) and `/search`, and the consent banner.

Thirteen languages (specs 004, 010): English at the root, and German, French, Spanish, Italian, Dutch, Polish,
Portuguese, Russian, Swedish, Danish, Norwegian and Finnish under `/de` `/fr` `/es` `/it` `/nl` `/pl` `/pt` `/ru` `/sv`
`/da` `/no` `/fi`. Only the home page, `/search` and `/guides` are
localized; support, privacy, terms, the guide articles and the 404 are English only.

```bash
npm install
npm run dev      # localhost:4321; add `-- --host` to reach it from a phone on the LAN
npm run build    # -> dist/
npm test         # vitest (tests/), build, then scripts/check-legal.mjs over dist (legal facts)
npm run preview
```

## Pages
| Route | Source |
|---|---|
| `/` | `src/pages/index.astro` + `src/views/Home.astro`, the search under `#search` (`src/components/SearchForm.astro`) |
| `/support` | `src/pages/support.astro` + `src/data/support.ts` |
| `/privacy` | `src/layouts/LegalLayout.astro` + `src/data/privacy.ts` |
| `/terms` | `src/layouts/LegalLayout.astro` + `src/data/terms.ts` |
| `/search` | `src/pages/search.astro` + `src/views/Search.astro` + `src/components/SearchForm.astro` + `src/scripts/*.ts`, the free web search |
| `/guides` | `src/pages/guides/index.astro` + `src/views/GuidesIndex.astro` |
| `/{lang}`, `/{lang}/search`, `/{lang}/guides` | `src/pages/[lang]/*.astro`, the same views with `src/i18n/{lang}.ts` |
| `/guides/{slug}` | `src/content/guides/{slug}.md` via `src/pages/guides/[slug].astro` + `src/layouts/GuideLayout.astro` |
| `/404` | `src/pages/404.astro`, noindex |
| `/sitemap.xml` | `src/pages/sitemap.xml.ts`, from `src/site-pages.ts` |
| `/robots.txt`, `/llms.txt` | `public/` |

The app and the App Store listing link `/`, `/support`, `/privacy` and `/terms`. They must stay
at those exact paths.

## Map data
`src/data/europe-map.json` (the home hero map) is generated from Natural Earth 50m land by
`scripts/europe-map.py`, which has no dependencies. Regenerate after changing its cities or viewport:

```bash
curl -sL https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson | uv run scripts/europe-map.py /dev/stdin > src/data/europe-map.json
```

## Fonts
`public/fonts/` holds Google Fonts' latin and latin-ext woff2 subsets. Bricolage Grotesque is cut to weights 700-800
(optical size kept) by `scripts/fonts.py`, which reads `bricolage-grotesque-{latin,latin-ext}.woff2`, writes
`bricolage-grotesque-700-800-*.woff2` and deletes its sources. Fonts are cached immutably by name, so a changed font
file needs a new name (and the new name in `src/styles/global.css` and `PRELOAD_FONTS` in `BaseLayout`).

Cyrillic (spec 010): Bricolage and Figtree have none, so Onest (variable, declared 400-800) follows them in
`--font-display` and `--font-body`, and IBM Plex Mono has its cyrillic faces under its own family name. Each is a
`cyrillic` and `cyrillic-ext` subset with Google's `unicode-range`, so only a page with Cyrillic text fetches them; the
footer names another language in another script (Русский) in the system font for the same reason. `scripts/fonts.py`
downloads any of them missing from `public/fonts/` (`DOWNLOADS`), never preloaded.

To regenerate, save the `/* latin */` and `/* latin-ext */` woff2 that Google Fonts lists for the full variable font
as those two sources in `public/fonts/`, then run the script:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800'
uv run --with fonttools --with brotli python scripts/fonts.py
```

## Places snapshot
`npm run places` writes what the search form opens on before `/meta` answers: `src/data/web-meta.json` (the web tier's
limits and currency, bundled) and `public/places.json` (the places with the site's languages' names, their country and,
as `local`, a city's name in its country's language when no kept name holds it, spec 010; fetched by the page on the
first focus or once idle, spec 008, as `/places.json?v={places_version}&l={site languages}`, cached immutably,
spec 009). The trimming rule and the country languages (`COUNTRY_LANG`) live in `src/scripts/local-names.mjs`, shared
by the script and the page. Regenerate both after the API's places change, so the version and the file move together:

```bash
npm run places
```

## Verification

```bash
npm run build && npm run preview -- --port 4329 &

# 200, one H1 and one canonical on every page.
for u in / /support /privacy /terms /search /guides; do
  curl -s localhost:4329$u | grep -c '<h1\|rel="canonical"'; done   # 2 each

# npm test already fails on trailing-slash or dead internal links, em dashes, "unlimited" in any of the
# thirteen languages, offers/aggregateRating in JSON-LD, non-reciprocal hreflang and a head that differs from
# the sitemap. Fare figures are left to a human read:
grep -rohE --include='*.html' '€ ?[0-9][0-9.,]*' dist   # only the labelled EXAMPLE_TRIP totals

# Canonicals and hreflang: a localized page is self-canonical with 13 alternates plus x-default -> the root;
# an English-only page has its canonical and no alternates.
curl -s localhost:4329/de/search | grep -oE '<link rel="(canonical|alternate)"[^>]*>'   # 1 + 14
curl -s localhost:4329/support   | grep -oE '<link rel="(canonical|alternate)"[^>]*>'   # 1
curl -s localhost:4329/sitemap.xml | grep -c 'xhtml:link'                              # 9 per localized URL
curl -sI localhost:4329/ -H 'Accept-Language: de' | head -1                            # 200, never a redirect
```

Consent, in a private window with DevTools open on the Network tab:
1. Load any page: the banner shows, and no request goes to `googletagmanager.com` or `google-analytics.com`.
2. Reject: the banner closes, `ffly_consent=denied`, and still nothing goes to Google after a reload.
3. Footer "Cookie settings", then Accept: `gtag/js` loads, `collect` requests carry `gcs=G101` (ad storage
   denied, analytics granted), and the choice holds on `/de` and `/support` (one cookie, `Path=/`).
4. "Cookie settings", then Reject: the `_ga*` cookies are deleted.

Then read every page at 390px and 1280px in both colour schemes, and `/de` and `/pl` (the longest strings)
with `/de/search` and `/pl/search`.

## Deploy
Vercel, from `main`. See [docs/001-deployment.md](docs/001-deployment.md).
