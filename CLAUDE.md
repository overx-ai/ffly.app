# ffly-site (ffly.app)

Marketing, support and legal site for **ffly** (`ai.overx.ffly`), the iPhone app for cheap
multi-city trips. Astro 4, static output, deployed on Vercel. Client JavaScript only on `/search`.

The app source lives at `../../0E-extensions/ios-ffly`, the API at `1B-bots` `apps/ffly-api`.
Those repos are the source of truth for copy, colours and claims.

## Tech Stack
- Astro 4, `output: 'static'`, `trailingSlash: 'never'`. **One dependency: `astro`.**
- **Zero client JavaScript, except `/search`.** Theme switching is pure CSS, the FAQ is `<details>`.
  `/search` (the free web search, `docs/specs/001-search-web-app.md`) ships one bundled script:
  `src/scripts/{ffly-api,search}.ts`, plain TypeScript, no framework, rendering via `textContent`/`<template>`
  only (never `innerHTML` with API data). It calls `FFLY_API_BASE` anonymously: `X-Platform: web`, never
  `X-Client-Id`. No ads: the ad scaffolding was removed (T-014) until an ads step with consent is specced.
- Deploy: `git push origin main`, then Vercel builds. `vercel.json` holds clean URLs, the
  security headers (CSP, nosniff, Referrer-Policy) and immutable caching of `/_astro/`; `npm test` checks
  them. The CSP allows no inline script and no third-party host but `api.overx.ai`: add any new one there.
  Hosting and DNS: [docs/001-deployment.md](docs/001-deployment.md).

## Critical conventions
- **`/`, `/support`, `/privacy`, `/terms` are fixed URLs.** The app's `LegalLinks.swift` and the
  App Store listing (`fastlane/metadata/*/{marketing,support,privacy}_url.txt`) point at them.
- **Register every page in `src/site-pages.ts`.** It drives the sitemap, the canonical tag and the
  "Last updated" line, so a page's date lives only there. Bump a page's `lastmod` only when its copy
  actually changed, never from the build clock.
- **Canonical URLs are non-trailing** (`/support`, not `/support/`). Never link one.
- **App facts live in `src/app.ts`**: limits, airlines, operator, publisher, API hosts,
  retention, external URLs. Do not hardcode any of them in a page.
- **One contact address: `CONTACT_EMAIL` (`support@overx.ai`)** for support, contact and privacy
  requests, as on the sibling sites. Change it there and nowhere else.
- **`APP_STORE_ID` is `undefined` until App Store Connect has the app.** The badge then renders
  "Coming soon", and the Smart App Banner and schema `installUrl` are omitted. Set the id to go live.
- **Legal and support copy lives in `src/data/{privacy,terms,support}.ts`**, typed by
  `src/data/types.ts`. TypeScript rather than the siblings' JSON so the email, operator and limits
  come from `src/app.ts`. English only.
- Operator string is `Yauheni Malashchytski, trading as OverX AI`, copied from vocele-web.
- Footer of every page carries "Created by overx.ai" linking to `https://overx.ai` (followed).

## Legal pages are one decision across repos
- `/privacy` lists exactly the seven types in `ios-ffly/Template/PrivacyInfo.xcprivacy` and
  `docs/compliance/data-inventory.yaml`: Product Interaction, Device ID (not linked), and Search
  History, Purchase History, User ID, Email Address (optional) and Customer Support (linked: every
  search carries the app user id and RevenueCat keeps purchases under it; the last two come from the
  feedback form, ios-ffly spec 012); none tracking. Change one, change all, plus the App Store
  Connect privacy answers. Retention (24 h jobs, 10 min entitlement cache) is from the API config.
  Feedback goes to 1B-bots `shared/form-aggregator` (database, logs, Telegram chat), which has no
  retention job: never state a number of days for it. Its facts are `FEEDBACK` in `src/app.ts`.
- `/terms` section 6 is the App Store 3.1.2(c) auto-renewable block (weekly and yearly), section 7
  the one-time Lifetime purchase (does not renew, does not cancel a running subscription), and
  section 1 links Apple's Standard EULA. No free trial is offered on any plan. Both are submission requirements. Cross-references say "Section 6": the layout
  numbers sections by order, so reordering breaks them.
- Copy was ported from the overx.ai worktree (`sites/main/src/content/ffly/*.ts`) on 2026-10-03.
  **This repo is now the source of truth**; do not re-extract.

## Copy rules
- **Never "unlimited".** Pro has a daily fair-use cap. The Pro line is
  "Every route in full, and no 3-search limit".
- **No prices**, in copy or JSON-LD (`offers`). No ratings or download counts. The one fare figure on
  the site is `EXAMPLE_TRIP` (a real live search, ios-ffly spec 001), always labelled "Example search"
  with its date and "not a price or saving you will get". Never restate it as a saving.
- **The value section follows `ios-ffly/docs/specs/002-value-story.md`**, and its "Never" column is
  binding: no invented or unmeasured numbers, no fear or guilt copy, no fake discounts or urgency,
  no medical claims about sleep, no claim that one priority is the right way to travel.
- "Favour sensible flight times over pre-dawn wake-ups and midnight landings", never a promise
  that no route has them.
- ffly is a search tool, not a travel agent; fares are indicative; Book opens "the airline's site or a booking
  site". Name a data source (Aviasales, Travelpayouts) only in `privacy.ts` and `terms.ts`, the legal
  disclosures of the data source, cookies, partner identifier and commission; never in marketing or support copy
  (`npm test` checks every other page and the JS bundle). Airlines (carriers) may be named anywhere.
- **Value, not mechanics**, outside the legal pages: no cache, Keychain, RevenueCat, server, background,
  bundle id, nor search limits such as "up to 8" cities. `LEGAL_ONLY` in `scripts/check-legal.mjs` bans them
  on every other page, in `llms.txt` and in the JS bundle.
- **No em dashes in published copy.** British spelling.

## Design
- Follows the system colour scheme, as the app does (it uses iOS semantic colours). Light tokens
  on bare `:root`, dark in the `prefers-color-scheme` media query; there is no theme toggle. Never
  declare a colour only inside a media block.
- **Owner rule: only the icon's colours** (navy, gold, red, white, black) and their tints and shades, as
  primitives at the top of `src/styles/global.css`; no other hue, no gradients. **Gold stays yellow**
  (`#F2C14E`, tint `#FCEFCB`), never darkened. On a light background gold is only a fill (with navy text),
  an underline of 2px or more, or a highlight; light-mode links and accents are navy. Dark mode may use
  gold as text and accent. Red is for the boarding-pass stamp and errors only.
- The home hero map is always a night map, in both schemes. Its geometry is computed at build time in
  `src/components/RouteMap.astro` from `src/data/europe-map.json` (regenerate: README); the fly is SVG
  `<animateMotion>`, so the home page ships no JavaScript. Label offsets there are hand-placed for
  `EXAMPLE_TRIP`: a new example needs new ones, and a new city needs a point in `scripts/europe-map.py`.
- Fonts are self-hosted latin woff2 in `public/fonts/`: Bricolage Grotesque (display), Figtree (body),
  IBM Plex Mono (data).
- `og:image:width/height` in `BaseLayout` match `public/og-image.jpg` (1200x675). Change both together.
- **No `favicon.svg`**: an SVG icon silently outranks every PNG.
- Hyphenated words in large headings go in `<span class="nw">` so they do not break at the hyphen.

## Workflows
- Verify: `npm test` (build, then `scripts/check-legal.mjs`), then the checks in README "Verification".
- Preview: `npm run preview`, read every page at 390px and 1280px in both colour schemes.

## Code comments
- **A comment is written only when it is essential to understanding intricate logic.** No
  boilerplate docstrings, never a comment "just in case". A wrong comment is worse than none.
