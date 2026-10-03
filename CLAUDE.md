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
  `X-Client-Id`. Ads stay off while `ADSENSE_CLIENT` is `undefined` in `src/app.ts`.
- Deploy: `git push origin main`, then Vercel builds. `vercel.json` is clean URLs only.
  Hosting and DNS: [docs/001-deployment.md](docs/001-deployment.md).

## Critical conventions
- **`/`, `/support`, `/privacy`, `/terms` are fixed URLs.** The app's `LegalLinks.swift` and the
  App Store listing (`fastlane/metadata/*/{marketing,support,privacy}_url.txt`) point at them.
- **Register every page in `src/site-pages.ts`.** It drives the sitemap and the canonical tag.
  Bump a page's `lastmod` only when its copy actually changed, never from the build clock.
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
  `docs/compliance/data-inventory.yaml`: Search History, User ID, Purchase History, Product
  Interaction, Device ID (not linked), and Email Address (optional) and Customer Support (linked, from
  the feedback form, ios-ffly spec 012); none tracking. Change one, change all, plus the App Store
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
- ffly is a search tool, not a travel agent; fares are indicative; you book on the airline's site.
- **No em dashes in published copy.** British spelling.

## Design
- Follows the system colour scheme, as the app does (it uses iOS semantic colours). Light tokens
  on bare `:root`, dark in the media query and `[data-theme="dark"]`. Never declare a colour only
  inside a media block.
- `--brand` is the app's `AccentColor`; `--grad` is sampled from the icon
  (`ios-ffly/design/icon/icon-a-gradient.png`). System rounded display stack, no webfont.
- `og:image:width/height` in `BaseLayout` match `public/og-image.jpg` (1200x675). Change both together.
- **No `favicon.svg`**: an SVG icon silently outranks every PNG.
- Hyphenated words in large headings go in `<span class="nw">` so they do not break at the hyphen.

## Workflows
- Verify: `npm run build`, then the checks in README "Verification".
- Preview: `npm run preview`, read every page at 390px and 1280px in both colour schemes.

## Code comments
- **A comment is written only when it is essential to understanding intricate logic.** No
  boilerplate docstrings, never a comment "just in case". A wrong comment is worse than none.
