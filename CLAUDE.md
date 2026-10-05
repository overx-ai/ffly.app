# ffly-site (ffly.app)

Marketing, support and legal site for **ffly** (`ai.overx.ffly`), the iPhone app for cheap
multi-city trips. Astro 4, static output, deployed on Vercel. Client JavaScript only in the search widget (`/` and `/search`) and the consent banner (every page).

The app source lives at `../../0E-extensions/ios-ffly`, the API at `1B-bots` `apps/ffly-api`.
Those repos are the source of truth for copy, colours and claims.

## Tech Stack
- Astro 4, `output: 'static'`, `trailingSlash: 'never'`. **One dependency: `astro`**, plus `vitest` (dev only) for `tests/`.
- **Zero client JavaScript, except the search widget and the consent module.** Theme switching is pure CSS, the
  FAQ is `<details>`. `ConsentBanner.astro` (in `BaseLayout`, every page) loads `src/scripts/consent.ts`, whose logic
  is the DOM-free, tested `consent-state.ts`.
  `SearchForm.astro` (specs 001 and 003) sits on `/` under `#search` and on `/search`, and ships one bundled
  script: `src/scripts/search.ts` over small DOM-free modules (`ffly-api`, `combobox`, `calendar`, `prefs`,
  `nudges`, `results`, `notify`, `scroll`) that `tests/` covers. Plain TypeScript, no framework, custom controls
  only (no `<select>`, `<datalist>`, date or number input), rendering via `textContent`/`<template>` only (never
  `innerHTML` with API data). It calls `FFLY_API_BASE` (contract pinned in `docs/PINS.md`) anonymously:
  `X-Platform: web`, never `X-Client-Id`, and never priority, filters or schedule. Its cookies and scroll time live
  in `src/app.ts`, its copy in `src/i18n/en.ts` (`widget.script`, shipped in SearchForm's `data-i18n` attribute).
- **Analytics only after consent.** GA4 loads only after Accept in the first-party banner (spec 004): `GA_MEASUREMENT_ID`
  and `CONSENT` in `src/app.ts`, `GA_CSP` in `scripts/check-legal.mjs`. gtag is defined in `consent.ts` and `gtag/js`
  injected only after Accept (Consent Mode v2 basic, ad storage and signals off); no page HTML may reference it, and
  the footer "Cookie settings" reopens the banner. Unset `GA_MEASUREMENT_ID` and the banner, the control, the CSP
  hosts and the `/privacy` analytics copy all go. When ads go on, AdSense in the EEA needs a Google-certified CMP, so
  that step replaces this banner with Google's consent message, covering analytics too.
- **Ads only after consent.** While `ADSENSE_CLIENT` in `src/app.ts` is undefined, no consent or ad script loads
  and `AdSlot` renders nothing (`npm test` asserts it). Set it, and `AD_SLOTS`, to load Google's consent message
  and then AdSense; `/privacy` switches its ad copy on the same constant.
- Deploy: `git push origin main`, then Vercel builds. `vercel.json` holds clean URLs, the
  security headers (CSP, nosniff, Referrer-Policy) and immutable caching of `/_astro/`; `npm test` checks
  them. The CSP allows no inline script and no third-party host but `api.overx.ai` and the analytics hosts
  (`GA_CSP`, only while `GA_MEASUREMENT_ID` is set): add any new one there.
  The ad and consent hosts (`AD_CSP` in `scripts/check-legal.mjs`) go in only with `ADSENSE_CLIENT`; `npm test`
  fails if the CSP and the constant disagree.
  Hosting and DNS: [docs/001-deployment.md](docs/001-deployment.md).

## Critical conventions
- **`/`, `/support`, `/privacy`, `/terms` are fixed URLs.** The app's `LegalLinks.swift` and the
  App Store listing (`fastlane/metadata/*/{marketing,support,privacy}_url.txt`) point at them.
- **Register every page in `src/site-pages.ts`.** It drives the sitemap, the canonical tag and the
  "Last updated" line, so a page's date lives only there. Bump a page's `lastmod` only when its copy
  actually changed, never from the build clock.
- **Canonical URLs are non-trailing** (`/support`, not `/support/`). Never link one.
- **Guides are markdown in `src/content/guides/`** (schema `src/content/config.ts`), rendered by
  `GuideLayout.astro`. The markdown `# ` heading is the H1. `src/guide-markdown.ts` builds FAQPage from the
  `## FAQ` section's `### question`s and HowTo from `### 1.`...`### N.` headings; `npm test` asserts both.
  A new guide needs its `guides/{slug}` entry in `SITE_PAGES` (the build fails without it), with `lastmod`
  equal to its frontmatter `updated`.
- **App facts live in `src/app.ts`**: limits, operator, publisher, API hosts,
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
  Connect privacy answers. Retention (24 h jobs) is from the API config.
  Feedback goes to 1B-bots `shared/form-aggregator` (database, logs, Telegram chat), which has no
  retention job: never state a number of days for it. The one feedback figure on the site, the app's
  offline queue expiry (ios-ffly `FeedbackQueueRules`), is `FEEDBACK` in `src/app.ts`.
- **Legal pages name recipients by category, never by vendor, and describe no mechanics.** Apple is the
  only company named; everyone else is "our subscription provider", "a messaging service our team uses to
  read feedback", "our hosting providers", "a booking partner". No hosts, endpoints, storage or restart
  mechanics, cache durations, internal identifier names or field lists: retention is a promise ("deleted
  within 24 hours"), identifiers are plain words ("a random identifier for your installation, not your
  Apple ID"). Model the voice on `src/data/support.ts`.
- `/terms` section 6 is the App Store 3.1.2(c) auto-renewable block (weekly and yearly), section 7
  the one-time Lifetime purchase (does not renew, does not cancel a running subscription), and
  section 1 links Apple's Standard EULA. No free trial is offered on any plan. Both are submission requirements. Cross-references say "Section 6": the layout
  numbers sections by order, so reordering breaks them.
- Copy was ported from the overx.ai worktree (`sites/main/src/content/ffly/*.ts`) on 2026-10-03.
  **This repo is now the source of truth**; do not re-extract.

## Copy rules
- **Never "unlimited".** Pro has a daily fair-use cap. The Pro line is
  "Every route in full, and no 3-search limit".
- **No prices**, in copy or JSON-LD (`offers`). No ratings or download counts. Fare figures appear only
  as real example searches, and each one carries its date and a "not a price you'll get" caveat:
  - `EXAMPLE_TRIP` on the home page (a live search, ios-ffly spec 001), labelled "Example search";
  - the dated searches the guides quote, recorded in `seo/experience.md` with their raw results.

  Never restate an example as a saving.
- **The value section follows `ios-ffly/docs/specs/002-value-story.md`**, and its "Never" column is
  binding: no invented or unmeasured numbers, no fear or guilt copy, no fake discounts or urgency,
  no medical claims about sleep, no claim that one priority is the right way to travel.
- "Favour sensible flight times over pre-dawn wake-ups and midnight landings", never a promise
  that no route has them.
- ffly is a search tool, not a travel agent; fares are indicative; Book opens "the airline's site or a booking
  site". Never name a data source or vendor (Aviasales, Travelpayouts, RevenueCat, Vercel...) on any page,
  the legal ones included: they say "a booking partner" and disclose its cookies, the partner identifier and
  the commission. Carriers are not named on the home, search and guides-index pages (any language) or in
  `llms.txt` (`CARRIERS` in `scripts/check-legal.mjs`); the guides and legal pages may name them, and search
  results show the carriers the API returns.
- **Value, not mechanics**, on every page: no cache, Keychain, server, memory, database, background,
  bundle id, endpoints or the API host, nor search limits such as "up to 8" cities. `MECHANICS` and
  `COPY_BANS` in `scripts/check-legal.mjs` ban them on every page (legal included), in `llms.txt`, and,
  except the API host, its URL and "HTTPS", in the JS bundle.
- **No em dashes in published copy.** British spelling, and each language's `tag` in `src/i18n/locales.ts`
  (`en-GB` for English) for every date and number.
  `npm test` fails on an em dash or "unlimited" on any page or in `llms.txt`.

## Design
- Follows the system colour scheme, as the app does (it uses iOS semantic colours). Light tokens
  on bare `:root`, dark in the `prefers-color-scheme` media query; there is no theme toggle. Never
  declare a colour only inside a media block.
- **Owner rule: only the icon's colours** (navy, gold, red, white, black) and their tints and shades, as
  primitives at the top of `src/styles/global.css`; no other hue, no gradients. **Gold stays yellow**
  (`#F2C14E`, tint `#FCEFCB`), never darkened. On a light background gold is only a fill (with navy text),
  an underline of 2px or more, or a highlight; light-mode links and accents are navy. Dark mode may use
  gold as text and accent. Red is for the boarding-pass stamp, errors and the results' "Watch out" chips only.
- The home hero map follows the colour scheme: mist sea, white land, `--navy-blue` legs and a navy fly in
  light, the night set in dark, all as custom properties in `src/components/RouteMap.astro`. Its geometry is
  computed at build time there from `src/data/europe-map.json` (regenerate: README); the fly is SVG
  `<animateMotion>`, so the map needs no JavaScript. Label offsets there are hand-placed for
  `EXAMPLE_TRIP`: a new example needs new ones, and a new city needs a point in `scripts/europe-map.py`.
- Fonts are self-hosted latin and latin-ext woff2 (split by `unicode-range`) in `public/fonts/`: Bricolage Grotesque (display), Figtree (body),
  IBM Plex Mono (data).
- `og:image:width/height` in `BaseLayout` match `public/og-image.jpg` (1200x675). Change both together.
- **No `favicon.svg`**: an SVG icon silently outranks every PNG.
- Hyphenated words in large headings go in `<span class="nw">` so they do not break at the hyphen.

## Workflows
- Verify: `npm test` (vitest, build, then `scripts/check-legal.mjs`), then the checks in README "Verification".
- Preview: `npm run preview`, read every page at 390px and 1280px in both colour schemes.

## Code comments
- **A comment is written only when it is essential to understanding intricate logic.** No
  boilerplate docstrings, never a comment "just in case". A wrong comment is worse than none.
