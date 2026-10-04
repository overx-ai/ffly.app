---
status: current
created: 2026-10-04
updated: 2026-10-04
---

# 000 - Tasks

> **TL;DR** — Low-severity backlog for ffly.app, first filled by the 2026-10-04 audit. The two high findings are
> `docs/bugs/001` (Terms vs the web search) and `002` (Search History linkage). Nothing here blocks the Vercel launch.

## Backlog
| # | Task | Project | Priority | Assigned To | Notes |
|---|------|---------|----------|-------------|-------|
| T-001 | **Astro 4.16.19 carries 11 advisories (1 critical, 9 high).** None is reachable on the static output (no SSR, server islands, `define:vars`, `transition:*`, `astro:assets`); the exposure is the dev/build machine. `npm audit fix --force` offers astro 6.0.5, which still has advisories; the clean target is astro ≥7.2.8. Cost: Node ≥22.12 (set it on the Vercel project too) and a check of the non-hoisted `<script>` in `search.astro` | ffly-site | low | - | audit 2026-10-04 |
| T-002 | **`astro dev/preview --host 0.0.0.0` exposes the vulnerable dev server to the LAN.** `package.json:7,9`. Fix: drop `--host 0.0.0.0`; pass `--host` only when needed | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-003 | **/terms shows "Last updated: October 4, 2026" though its text last changed 2026-10-03.** `terms.ts:13` uses the shared `LEGAL_EFFECTIVE_DATE`; `site-pages.ts:14` lastmod says 10-03; `SUPPORT.lastUpdated` is a third source. Fix: one date per page in `site-pages`, derive `lastUpdated` and `lastmod` from it | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-004 | **Support's "delete my data" answer skips feedback and the optional email.** `support.ts:58-62`. Feedback and its optional email are linked data with no retention limit, and the only linked data we can find by email. Fix: one sentence pointing to privacy Section 8 and support@overx.ai | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-005 | **Web search `fetch` has no timeout.** `ffly-api.ts:78,89`: a stalled connection leaves "Starting" with the button disabled for minutes. Fix: `signal: AbortSignal.timeout(WEB_SEARCH.requestTimeoutMs)`, routed to the `network` path | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-006 | **One failed poll ends the web search.** `search.ts:476` shows an error on a single 502/network drop. Fix: retry the GET 2-3 times with backoff before `showProblem` | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-007 | **No security or cache headers.** `vercel.json:1-4` has no `headers`. Fix: CSP `default-src 'self'; connect-src 'self' https://api.overx.ai; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`, nosniff, Referrer-Policy, and `Cache-Control: public, max-age=31536000, immutable` on `/_astro/(.*)` | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-008 | **"Free to try: 3 searches" sits beside "Try it on the web" (1/day).** `index.astro:106-107`. Fix: "Free in the app: 3 searches" | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-009 | **FAQ JSON-LD answers keep source indentation.** `schema.ts:73`. Fix: `.replace(/\s+/g, ' ').trim()` | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-010 | **`pathFor(slug: string)` accepts typos.** `site-pages.ts:18,20`: the exported `Slug` type is unused. Fix: type the parameter as `Slug` | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-011 | **README and llms.txt predate /search.** `README.md:3` says "zero client JavaScript"; `public/llms.txt:7-15` omits /search. Fix: list /search in both, reword the README line | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-012 | **Repeated site-origin and breadcrumb code.** `Astro.site?.href.replace(/\/$/, '') ?? ''` ×5 (BaseLayout:18, LegalLayout:12, search:12, support:10, index:10); `sitemap.xml.ts:8` repeats the default; breadcrumbs built in 3 pages. Fix: export `siteOrigin` once, build breadcrumbs in BaseLayout | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-013 | **Route-chain CSS copied twice.** `index.astro:310-338` and `search.css:178-206`. Fix: one `.chain` rule in global.css | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-014 | **Dead ad scaffolding.** `AdSlot.astro`, `ADSENSE_*`/`AdPosition` (`app.ts:90-94`), `search.css:230`: setting the ids renders three empty 250 px boxes (no loader, no consent banner). Fix: delete until the ads step is built | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
| T-015 | **Dead `[data-theme="dark"]` token block.** `global.css:66-76` duplicates the dark tokens for a toggle that does not exist. Fix: delete it and the `:not([data-theme="light"])` qualifier | ffly-site | low | - | audit 2026-10-04; done 2026-10-04 |
