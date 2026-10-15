# ffly-site

Website for **ffly**, at `ffly.app`. Astro 4 in hybrid output with the Vercel adapter (spec 014): every page is
prerendered, and only the sign-in routes under `/api/auth` run as a function. Two dependencies, `astro` and
`@astrojs/vercel` (plus `vitest`, dev only). Zero client JavaScript, except the free web search widget on `/`
(`#search`) and `/search`, the consent banner, and the language hint and header language menu (spec 012).

Thirteen languages (specs 004, 010): English at the root, and German, French, Spanish, Italian, Dutch, Polish,
Portuguese, Russian, Swedish, Danish, Norwegian and Finnish under `/de` `/fr` `/es` `/it` `/nl` `/pl` `/pt` `/ru` `/sv`
`/da` `/no` `/fi`. Only the home page, `/search` and `/guides` are
localized; support, privacy, terms, the guide articles and the 404 are English only. The header and the footer both
switch language; a visitor whose browser asks for another of the thirteen gets a dismissable hint offering it, never a
redirect.

```bash
npm install
npm run dev      # localhost:4321; add `-- --host` to reach it from a phone on the LAN
npm run build    # -> .vercel/output/ (static/ pages, functions/ the sign-in routes)
npm test         # vitest (tests/), build, then scripts/check-legal.mjs over .vercel/output/static (legal facts)
npm run preview  # serves .vercel/output as Vercel does; `astro preview` does not support the adapter
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
grep -rohE --include='*.html' '€ ?[0-9][0-9.,]*' .vercel/output/static   # only the labelled EXAMPLE_TRIP totals

# Canonicals and hreflang: a localized page is self-canonical with 13 alternates plus x-default -> the root;
# an English-only page has its canonical and no alternates.
curl -s localhost:4329/de/search | grep -oE '<link rel="(canonical|alternate)"[^>]*>'   # 1 + 14
curl -s localhost:4329/support   | grep -oE '<link rel="(canonical|alternate)"[^>]*>'   # 1
curl -s localhost:4329/sitemap.xml | grep -c 'xhtml:link'                              # 9 per localized URL
curl -sI localhost:4329/ -H 'Accept-Language: de' | head -1                            # 200, never a redirect

# Sign-in routes (spec 014): POST or DELETE only, this site's Origin only, never cached.
curl -si -X POST localhost:4329/api/auth/token -H 'Origin: http://localhost:4329' | head -4  # 401, no-store, cookie cleared
curl -si -X POST localhost:4329/api/auth/token -H 'Origin: https://evil.example' | head -1   # 403
curl -si localhost:4329/api/auth/token | head -1                                             # 404
```

Accounts, Pro and the Trip kit (spec 014), once `CONTRACT_1_12` and `AUTH.googleClientId` are set, on ffly.app (Apple and
Google accept no other origin) with DevTools open:
1. Signed out: `/search` sends nothing to `appleid.cdn-apple.com` or `accounts.google.com`, no `/api/auth` request, and
   the API's GETs carry no `Authorization` and no preflight.
2. Sign in with Apple (a popup) and with Google: the sheet closes, the row says "Signed in", `ffly_session` is
   `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`, and no token is in `localStorage`, `sessionStorage`,
   `document.cookie` or the URL (`ffly.account` holds only `1`). `/meta` is asked again with `Authorization`.
3. A Pro account's caps and daily searches follow `/meta`; its legs offer Book direct and Book via partner. A Free
   visitor sees Book via partner, the "Pro found this route about €X cheaper" line and the upsell.
4. During a search the progress card shows "Partner offers"; each route's details show its own.
5. After Accept, Book and kit clicks send `book_click` and `kit_click` (`placement`, `kind`, `tier`); after Reject
   they send nothing and still open.
6. Sign out: the cookie is cleared and the caps drop to Free. Delete `ffly_session` by hand and reload: one "You're
   signed out." line, no loop.

Consent, in a private window with DevTools open on the Network tab:
1. Load any page: the banner shows, and no request goes to `googletagmanager.com`, `google-analytics.com` or the
   `AD_NETWORK_SCRIPT` host.
2. Reject: the banner closes, `ffly_consent=denied.2` (the choice, then `CONSENT.revision`), and still none of them
   load after a reload.
3. Footer "Cookie settings", then Accept: `gtag/js` and the partner script (`data-cmp-ab="2"`) load, `collect`
   requests carry `gcs=G101` (ad storage denied, analytics granted), and the choice holds on `/de` and `/support`
   (one cookie, `Path=/`), where both load again.
4. "Cookie settings", then Reject: the page reloads without them and the `_ga*` cookies are deleted.
5. With Global Privacy Control on, no banner shows and none of them load.
6. Set `ffly_consent=granted` by hand (a choice from before the partner purpose) and reload: the banner shows again
   and none of them load.

Language hint, in a browser set to Russian: `/` shows "Эта страница есть на русском" linking `/ru`, in the system
font on `/de`; ✕ hides it for good; `/ru` shows none. The header globe on `/search` links `/ru/search`, on `/support` `/ru`.

Then read every page at 390px and 1280px in both colour schemes, and `/de` and `/pl` (the longest strings)
with `/de/search` and `/pl/search`.

## Deploy
Vercel, from `main`. See [docs/001-deployment.md](docs/001-deployment.md).
