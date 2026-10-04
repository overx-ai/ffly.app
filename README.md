# ffly-site

Website for **ffly**, at `ffly.app`. Astro 4, static, one dependency. Zero client JavaScript, except the
free web search at `/search`.

```bash
npm install
npm run dev      # localhost:4321; add `-- --host` to reach it from a phone on the LAN
npm run build    # -> dist/
npm test         # build, then scripts/check-legal.mjs over dist (legal facts)
npm run preview
```

## Pages
| Route | Source |
|---|---|
| `/` | `src/pages/index.astro` |
| `/support` | `src/pages/support.astro` + `src/data/support.ts` |
| `/privacy` | `src/layouts/LegalLayout.astro` + `src/data/privacy.ts` |
| `/terms` | `src/layouts/LegalLayout.astro` + `src/data/terms.ts` |
| `/search` | `src/pages/search.astro` + `src/scripts/{ffly-api,search}.ts`, the free web search |
| `/guides` | `src/pages/guides/index.astro` |
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

## Verification

```bash
npm run build && npm run preview -- --port 4329 &

# 200, one H1 and one canonical on every page.
for u in / /support /privacy /terms /search /guides; do
  curl -s localhost:4329$u | grep -c '<h1\|rel="canonical"'; done   # 2 each

# npm test already fails on trailing-slash or dead internal links, em dashes, "unlimited" and
# offers/aggregateRating in JSON-LD. Fare figures are left to a human read:
grep -rohE --include='*.html' '€ ?[0-9][0-9.,]*' dist   # only the labelled EXAMPLE_TRIP total
```

Then read every page at 390px and 1280px in both colour schemes.

## Deploy
Vercel, from `main`. See [docs/001-deployment.md](docs/001-deployment.md).
