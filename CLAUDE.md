# ffly-site (ffly.app)

Marketing, support and legal site for **ffly** (`ai.overx.ffly`), the iPhone app for cheap
multi-city trips. Astro 4, hybrid output on Vercel: every page prerendered, only the sign-in routes run on a server (spec 014). Client JavaScript only in the search widget (`/` and `/search`), the consent banner and the language module (every page).

The app source lives at `../../0E-extensions/ios-ffly`, the API at `1B-bots` `apps/ffly-api`.
Those repos are the source of truth for copy, colours and claims.

## Tech Stack
- Astro 4, `output: 'hybrid'` with `@astrojs/vercel/serverless`, `trailingSlash: 'never'`. **Two dependencies: `astro` and
  the adapter**, plus `vitest` (dev only) for `tests/`. Every page stays prerendered; only `src/pages/api/auth/*`
  (`prerender = false`) run, as one Vercel function, beside Astro's `/_image`, pointed at a 404 stub
  (`src/server/no-image.ts`; the site has no `astro:assets` images). The build writes `.vercel/output/` (`static/` is what
  `check-legal` reads, `config.json` the routes it checks); `npm run preview` is `scripts/preview.mjs`, because
  `astro preview` does not support the adapter.
- **Zero client JavaScript, except the search widget, the consent module and the language module.** Theme switching
  is pure CSS, the FAQ and the header language menu are `<details>`. `ConsentBanner.astro` (in `BaseLayout`, every page)
  loads `src/scripts/consent.ts`, whose logic is the DOM-free, tested `consent-state.ts`. `LangHint.astro` (in
  `BaseLayout`, every page) loads `src/scripts/lang-hint.ts` (spec 012), whose logic is the DOM-free, tested
  `lang-hint-state.ts`: it shows the language hint, remembers a picked language, and closes the header menu on Escape
  or a click outside.
  `SearchForm.astro` (specs 001 and 003) sits on `/` under `#search` and on `/search`, and ships one bundled
  script: `src/scripts/search.ts` over small DOM-free modules (`ffly-api`, `combobox`, `calendar`, `prefs`,
  `nudges`, `results`, `notify`, `scroll`, `ticker`, `places`, `places-store`, `filters`, `library`, `share-text`, `visa`)
  that `tests/` covers. Plain TypeScript, no framework, custom controls
  only (no `<select>`, `<datalist>`, date, time or number input), rendering via `textContent`/`<template>` only (never
  `innerHTML` with API data). It calls `FFLY_API_BASE` (contract pinned in `docs/PINS.md`) anonymously and with no
  custom header (no `X-Platform`, never `X-Client-Id`): the API's default channel is web, so its GETs are simple CORS
  requests with no preflight. The pages carrying it preconnect to the API origin
  (`BaseLayout` `preconnectApi`). Its cookies and scroll time live in `src/app.ts`, its copy in `src/i18n/en.ts`
  (`widget.script`, shipped in SearchForm's `data-i18n` attribute).
- **Accounts, Pro and the Trip kit (spec 014), behind `CONTRACT_1_12`** (`src/app.ts`, shared with spec 015; false until
  ffly API 1.12.0 is live). Off, the site behaves as before: a 1.12.0 answer renders as 1.11's and no request carries a
  header. On:
  - **Sign-in**, per provider (spec 016): `SIGN_IN_PROVIDERS` (`signInProviders`) holds Apple once `AUTH.appleRegistered`
    is true (the Services ID `AUTH.appleServiceId` registered with its return URL, 1B-bots spec 573 T1) and Google once
    `AUTH.googleClientId` is set (573 T2); `SIGN_IN` is on while either is. Only a ready provider's button renders and only
    its script loads, so Apple can go live without Google. The page gets an Apple identity token (Apple JS, popup, scope
    `email`, `signIn()` inside the click) or a Google credential (GIS button plus One Tap), each script loaded only when
    the visitor opens the sheet, and posts it to `/api/auth/{apple,google}`.
    `src/server/auth-session.ts` trades it at overx-auth (`AUTH.base`); `/api/auth/token` refreshes, `/api/auth/session`
    (DELETE) revokes. Every route: POST or DELETE only, this site's own `Origin`, `Cache-Control: no-store`, no secret.
    The refresh token lives only in `AUTH.cookie` (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`); the access token
    only in page memory (`src/scripts/auth-state.ts`), never in storage, a script-readable cookie or the URL.
    `localStorage` `AUTH.hintKey` holds `1` once this browser signed in, so a visitor who never did costs no request.
    The header's Sign in link (`.nav-sign-in`) opens the sheet on `/` and `/search` and becomes Account (to
    `#account-status`) once signed in; elsewhere it goes to `/search#sign-in` (`AUTH.signInHash`), which opens the sheet
    for a signed-out visitor and is then dropped from the URL, so a reload loads no provider script.
  - **API calls** (`ffly-api.ts` `setCaller`): no header while signed out (no preflight), `Authorization: Bearer` while
    signed in on `/meta`, `/searches`, `/trip-kit`; never on `/places` or `/searches/shared`. A 401 refreshes once and
    retries; a second signs out and goes on as Free. Signing in or out asks `/meta` again and `applyMeta` redraws the caps:
    **no limit is ever a literal in the site**. The web's searches per window (ffly API 1.13.0, `searchWindow`) word the
    quota note and spent line (`quota.ts`) and, through `web-meta.json`, the home FAQ; without them no count is named.
    A Pro account (`proCaller`) sees no app strip, queue line, quota note or city-cap notice (spec 016).
  - **Results** (`results.ts`): one plain Book per leg, the first of `leg.offers[]` whatever its kind (founder, 2026-10-17) (`rel="sponsored noopener"`, the URL as
    the API sends it, https only), no commission line beside them (founder, 2026-10-15); `route.pro_preview` becomes one
    "Pro found this route about €X cheaper" line under the first route that has one, replacing the app hint; the upsell
    compares Free and Pro with no number and leads with "Already have Pro? Sign in with the same account".
  - **Trip kit**: `GET /trip-kit` in the progress card, `route.trip_kit[]` in each route's details, each block headed
    **"Partner offers"**, text only, labelled from the site's i18n by kind, never with the API's `seller`.
  - **Tracking** (`track.ts`): Book and kit clicks send GA4 `EVENTS` (`placement`, `kind`, `tier`; never a city, date,
    price or account) only once Accept has started analytics (`consent-state.ts` `analytics()`), by beacon, never
    delaying or cancelling the click.
  - **CSP**: `PROVIDER_CSP` in `scripts/sign-in.mjs` (Apple JS's host in `script-src`; GIS's in `script-src`,
    `frame-src`, `connect-src`, `style-src`): each provider's hosts must be in `vercel.json` exactly while it is ready
    (`check-legal` reads readiness from `AUTH` as the site does, and a test holds the two to one answer). While sign-in is
    on, /privacy `#website` names `AUTH.cookie` and the storage note, and `#account`'s website sentence the ready
    providers (bump its `lastmod`). Bundle bans skip the Services ID, an identifier Apple's script needs.
- **Every app feature on the web (spec 015); only the plan limits differ, and those come from `/meta`.**
  - **One request model.** `buildRequest` sends the trip, then each option only when the visitor set it **and**
    `allowedFields` allows it: absent from `/meta` `tier_limits.app_only_fields`, and for the 1.12.0 fields (`optional`,
    `excluded`, `pinned`, `max_stops_per_leg`, `max_stops_total`, `schedule`, `airports`, `priority`) `CONTRACT_1_12` on.
    A `/meta` without the list allows none. So a default search is byte-identical to the request before spec 015, and
    1.11 (which lists all eight for the web) gets only `travellers`. A `422 app_only` naming a field drops it for the
    page view ("That option isn't on the web yet.") and keeps the form filled. `submit` passes every request through the
    gate again (`allowedOnly`), so a skipped flight's, a retry's or a kept one's never carries a field refused since.
    Flight hours equal to the API's defaults (`API_HOURS`, held to the pinned schema) count as unset.
  - **Controls** (`SearchForm.astro`): the trip type above the trip (round trip is `cities: [To]`, `ends: [From]`;
    one way `cities: []`, `ends: [To]`, API 1.10.0; multi-city today's form), and a closed **Options** panel (CLS 0):
    travellers, What matters most? (`/meta` `priorities`, labels from the site's i18n), direct flights only and max
    connections, flight hours (a time list, `time-list.ts`), a city's date pin (`calendar.ts` with bounds and one-day
    picks) and airports, and passports. Must or maybe is a toggle on each city chip. Each shows while its field is
    allowed (`data-field`/`data-any`); each "In the app" chip (`data-locked-field`) shows while its field is refused, and
    "More cities" (a plan limit) always in 1.0, never in v2 (spec 016); the group hides while no chip shows. Rules as the
    API's, in `filters.ts`; caps in `REQUEST_LIMITS` (`src/app.ts`, held to the pinned schema by
    `tests/contract/ffly-api-parity.test.ts`). The v2 rotation has no flight hours tip.
  - **After results:** a leg's ⋯ menu skips a flight (`excluded`, built from the leg; its `source` is sent back as
    received and never shown, logged or put in a link) and runs the search again; the skipped-flights bar's Undo brings
    the previous result back from the page without a search. Each full route's details carry Save and Share
    (`share-text.ts`, the app's RouteShareText: `navigator.share` with the text and the link, else the clipboard).
    Visa flags (`visa.ts`, the app's VisaRules and MIT Passport Index table in `public/visa.json` with
    `public/visa-LICENSE.txt`, fetched only once a passport is set; passports never leave the browser). A rating
    (`#rating`, settled once given; one to three stars link to /support) goes out only as GA4 `EVENTS.rate` through
    `track()` after Accept.
  - **Your trips** (`#library-sheet`, a `<dialog>`): saved routes (`LIBRARY.maxSaved`, compare two or three) and
    recent searches (`LIBRARY.maxHistory`), each kept whole (`library.ts`) because a web result expires at its first
    day; with storage off or full the search still runs and Save says so. Keys and caps in `LIBRARY`; /privacy
    `#website` says they stay in the browser (`check-legal` asserts it).
  - **Shared links** carry each set option readably (`maybe`, `pins=ROM:2026-11-05..2026-11-06`, `stops`,
    `connections`, `hours=07:00-21:00`, `airports`, `priority`, `adults`/`children`/`infants`; an empty `cities=` with
    `back` is one way), never skipped flights. A link with any option only pre-fills (`canLookup`): the shared lookup
    names the trip alone.
- **Shareable searches (spec 005).** The URL carries the whole trip: `from`, `back` (omitted when it is just `from`),
  `cities` (comma-separated, as in the app's share link), `dates=YYYY-MM-DD..YYYY-MM-DD`, `nights=min-max`
  (`shareQuery` in `prefs.ts`, written with `replaceState` on submit and on results). A complete link with a future
  `date_from` asks `GET /searches/shared` (API ≥ 1.5.0, no quota): a finished hit renders with "Searched {date}" and
  **Search again** and is never polled or saved; a running one is polled; anything else only pre-fills the form, so no
  free search is spent unasked. The results table is always on the page (empty state, placeholders).
  `AppStrip.astro` (`#app-side`) rotates the nudges every `WEB_SEARCH.nudgeMs` (`ticker.ts`), paused on hover, focus,
  a hidden tab or off screen, never under reduced motion; its dots stop it.
- **Back to (spec 006)** is a chip list like Cities, capped by `/meta` `tier_limits.max_ends` (`endLimit`; at 1 it is
  the old single field), sent as `ends` and as `back=A,B` in the URL and cookie; chip rules live in `places.ts`.
  Every place field has a clear button shown by CSS only while it has text (`PlaceCombo`).
- **Analytics and the partner script only after consent.** GA4 loads only after Accept in the first-party banner (spec
  004): `GA_MEASUREMENT_ID` and `CONSENT` in `src/app.ts`, `GA_CSP` in `scripts/check-legal.mjs`. gtag is defined in
  `consent.ts` and `gtag/js` injected only after Accept (Consent Mode v2 basic, ad storage and signals off); no page HTML
  may reference it, and the footer "Cookie settings" reopens the banner. `AD_NETWORK_SCRIPT` (the flight booking
  partner's loader) is gated the same way (founder, 2026-10-15, spec 013: the network's site verification is done):
  `consent.ts` `loadConsented` injects both after Accept and on every later page with a stored Accept; Reject and GPC
  load neither. The banner, its Cookie settings control and the consent cookie exist while either is set
  (`CONSENT_NEEDED`), and the banner says one sentence per purpose (`consent.analytics`, `consent.partner`, then
  `consent.ask`, in all 13 languages). Unset one and its CSP host, banner sentence and `/privacy` copy go. The cookie
  stores the choice with `CONSENT.revision` (`granted.2`): **raise it whenever the banner gains a purpose**, so a choice
  stored before is asked again (consent is specific). A browser sending Global Privacy Control counts as Reject until the
  visitor accepts in Cookie settings (`initialChoice`), as `/privacy` `#ccpa` promises. When ads go on, AdSense in the EEA needs a Google-certified CMP, so
  that step replaces this banner with Google's consent message, covering analytics too.
- **Ads only after consent.** While `ADSENSE_CLIENT` in `src/app.ts` is undefined, no consent or ad script loads
  and `AdSlot` renders nothing (`npm test` asserts it). Set it, and `AD_SLOTS`, to load Google's consent message
  and then AdSense; `/privacy` switches its ad copy on the same constant.
  No page's HTML may reference the `AD_NETWORK_SCRIPT` host; the bundle carries it while it is set, its host stays in
  the CSP `script-src`, and `/privacy` `#website` and `#legal-bases` put it on consent; `npm test` checks all of it. If
  the network's verification ever needs it ungated again, that is a new owner decision, never a silent change.
- Deploy: `git push origin main`, then Vercel builds. `vercel.json` holds clean URLs, the
  security headers (CSP, nosniff, Referrer-Policy), immutable caching of `/_astro/`, `/fonts/` and `/places.json`, a week's caching
  of the icons and images, and the `Speculation-Rules` header naming `public/speculation-rules.json` (prefetch on
  hover or touch, never prerender; served as `application/speculationrules+json`); `npm test` checks them. The CSP
  allows no inline script and no third-party host but `api.overx.ai`, the analytics hosts (`GA_CSP`, only while
  `GA_MEASUREMENT_ID` is set) and the `AD_NETWORK_SCRIPT` host: add any new one there.
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
- **Guides are markdown in `src/content/guides/{lang}/`** (schema `src/content/config.ts`; the folder is the locale,
  `GUIDE_LANGS` in `src/guides.ts`: en, de, fr, es), rendered by
  `GuideLayout.astro`. The markdown `# ` heading is the H1. `src/guide-markdown.ts` builds FAQPage from the
  `## FAQ` section's `### question`s and HowTo from `### 1.`...`### N.` headings; `npm test` asserts both.
  A new guide needs its `guides/{slug}` entry in `SITE_PAGES` (`de/guides/{slug}` for a German one; the build fails
  without it), with `lastmod` equal to its frontmatter `updated`.
- **App facts live in `src/app.ts`**: limits, operator, publisher, API hosts,
  retention, external URLs. Do not hardcode any of them in a page.
- **One contact address: `CONTACT_EMAIL` (`support@overx.ai`)** for support, contact and privacy
  requests, as on the sibling sites. Change it there and nowhere else.
- **`APP_STORE_ID` is `undefined` until App Store Connect has the app.** The badge then renders
  "Coming soon", and the Smart App Banner and schema `installUrl` are omitted. Set the id to go live.
- **Legal and support copy lives in `src/data/{privacy,terms,support}.ts`**, typed by
  `src/data/types.ts`. TypeScript rather than the siblings' JSON so the email, operator and limits
  come from `src/app.ts`. English only.
- The operator is a person: `OPERATOR` = `Yauheni Malashchytski` (owner, 2026-10-07: "don't mention overx, just my name"),
  with `OPERATOR_COUNTRY` (Belarus) in `src/app.ts`. OverX appears only in the
  footer credit and the contact address: `check-legal` fails on "OverX" in the main content of /privacy, /terms, /support.
- **No page shows a postal address or a phone number** (owner, 2026-10-08). The legal pages say the address is given
  on request by email (`ADDRESS_ON_REQUEST` in `src/data/sections.ts`); `check-legal` fails on a street address, a
  flat number, a phone number or a `tel:` link in any built page or `llms.txt`.
- Footer of every page carries "Created by overx.ai" linking to `https://overx.ai` (followed).

## Languages (spec 004)
- en at the root; de, fr, es, it, nl, pl, pt (pt-PT), ru, sv, da, nb (prefix `/no`), fi under their prefix (spec 010).
  Rows in `src/i18n/locales.ts`, fields in the order `code, prefix, hreflang, tag, og` (two regexes read it). Norwegian
  is `nb` in code, tag and hreflang (the API's names and the app's strings), `/no` in the URL.
- Localized: `/`, `/search`, `/guides` only (views in `src/views`, routes in `src/pages/[lang]`).
  Support, privacy, terms and the 404 stay English at the root. Guide articles (spec 018) are English at
  `/guides/{slug}`, or written natively at `/{prefix}/guides/{slug}`: self-canonical, no alternates, never translations.
  `/{prefix}/guides` lists that language's guides first, then the English ones marked "In English".
- Every page self-canonical. Localized pages: reciprocal hreflang for all 13 plus `x-default` → root, same
  set in the sitemap (`alternates()` in `src/site-pages.ts`). English-only pages: no alternates.
- Never redirect by browser language or IP. Instead (spec 012): the header carries the footer's switcher
  (`LanguageLinks.astro`, one list for both, the same page in each language where it has one, else that language's
  home) as a globe `<details>` menu, and on localized pages only a hidden card (`LangHint.astro`, every language's
  `common.langHint` and target in `data-hints`) offers the first of `navigator.languages` the site has when it is not
  the page's, in that language. It never shows again once dismissed or once any language link is clicked
  (`LANG_HINT.storageKey` in `localStorage`, `/privacy` `#website` says so). A hint in another script than the page's
  uses the system font, so a Latin page never fetches Onest. `check-legal` asserts the header menu equals the footer
  list and the card is on exactly the localized pages with every string filled.
- Copy lives in `src/i18n/{lang}.ts`, each `satisfies Dict`; never hardcode copy in a view.
- **Two editions (spec 016).** Each dictionary's `v2` block holds the v2 money model's copy (Free the same in the app and
  on the web; "cheaper", "goes first" and "more cities" said of ffly Pro, never of the app), in the dictionary's own
  shape. `useLang` serves `editionOf(dict, CONTRACT_1_12)`, the one place that picks 1.0 or v2; `overlay` replaces a
  plural or a list whole. A 1.0 line that v2 makes false gets a `v2` key, never a branch in a view. Spec 014's flag-only
  UI (`widget.offers`, `widget.account`) keeps its own keys. `APP_CLAIM` (`scripts/copy-rules.mjs`) holds English v2 to
  no app claim, in `tests/i18n.test.ts` and, with the flag on, in `check-legal`.
- Shared terms (plan names, Book, priorities) come from ios-ffly `Scripts/l10n/{lang}.json`; German says "du".
- City names come from the API's `names` in the page's language (`placeName`: exact tag, then base language, then the
  English `name`), nominative and never inflected: copy never puts a city into a grammatical case. Polish and Russian plurals need
  `few` and `many`.
- **Places open at once (specs 007, 008).** `npm run places` (committed output) writes `src/data/web-meta.json`, the web
  tier's limits, currency and places version, bundled for first paint, and `public/places.json`, the 3,493 places (API
  1.8.0, names trimmed to the site's languages), **never in the JS bundle**: the page fetches it same-origin on the first
  focus in the form or once idle. Until then a place field says "Loading cities…", never an empty list; only a link or
  cookie naming places waits for it. A visitor's own copy lives in `localStorage` under `WEB_SEARCH.placesKey`, keyed
  by `/meta` `places_version`; a version past the static file's fetches `/places` (If-None-Match). **Spec 009:** `/meta` is
  asked with `?places=false`; the stored list is read only once the page is idle or a place field needs it; a stored
  list whose version equals `/meta`'s `places_version` is never fetched again; `places.json` is fetched as
  `?v={version}&l={PLACES_LANGS}` and cached immutably (`check-legal` asserts the header, the versioned URL and that the file's
  version is `web-meta.json`'s). The place fields
  never wait for `/meta`; Find route does. `matchPlaces` folds each list once per language (keep it under the
  keystroke budget in `tests/combobox.test.ts`). A query matches the page language's name, the English name, the city's local name (`local`, or its name in
  `COUNTRY_LANG[country]`, `src/scripts/local-names.mjs`), the city code and every airport code, as the app does plus the
  local name. Suggestions show the country (`Intl.DisplayNames`), nothing else does; a city with more than one airport
  shows `allAirports` beside its codes in the list, never in the chosen field. The stored list carries `PLACES_LANGS`, so
  adding a language replaces every visitor's copy once.
  The example trip's labels (map, pass) are named from `public/places.json` at build time (`src/example-city.ts`); the
  map's `europe-map.json` and `LABELS` stay keyed by the English name.
- Every copy rule holds in every language; `check-legal` bans "unlimited" in all thirteen (`UNLIMITED`).

## Legal pages are one decision across repos
- `/privacy` `#app-store-labels` lists exactly the nine types in `ios-ffly/Template/PrivacyInfo.xcprivacy` and
  `docs/compliance/data-inventory.yaml`, in Apple's names, each in a `<span class="label">`: **tracking** Device ID (the
  IDFA, only after ATT "Allow", with AppsFlyer, ios-ffly specs 016 and 024); **linked** Search History, Purchase History,
  User ID, Email Address, Customer Support and Device ID; **not linked** Product Interaction, Crash Data and Performance
  Data. `check-legal` reads the inventory when the sibling is checked out (else its pinned copy, `PINNED_LABELS`) and
  fails on any difference, and on any "no tracking" claim. `#attribution` describes AppsFlyer, SKAdNetwork and the Apple
  Search Ads token, the EEA/UK/CH rule (nothing until Settings › Privacy › Ad measurement) and how to withdraw;
  `#live-activity` the push token, gone with the search. Change one, change all, plus the App Store Connect privacy
  answers. Retention (24 h jobs) is from the API config. A finished web search is kept, with nothing
  that identifies the searcher, until its `date_from` (1B-bots spec 535), so shared links work: `/privacy`
  `#web-search` and `#retention` say so and `check-legal` asserts it.
  Feedback goes to 1B-bots `shared/form-aggregator` (database, logs, Telegram chat), which has no
  retention job: never state a number of days for it. The one feedback figure on the site, the app's
  offline queue expiry (ios-ffly `FeedbackQueueRules`), is `FEEDBACK` in `src/app.ts`.
- **Only /privacy and /terms name vendors, and only the processors** (`NAMED_PROCESSORS` in `check-legal`, owner
  2026-10-07): Apple, RevenueCat, AppsFlyer and Google (website analytics after consent; AdSense only with
  `ADSENSE_CLIENT`), each with its role, the data and a link to its policy (`EXTERNAL` in `src/app.ts`). Every other page
  names none of them, and every other recipient stays a category everywhere: "our hosting providers", "a messaging
  service our team uses to read feedback", "a booking partner". Legal pages describe no mechanics: no hosts, endpoints, storage or restart
  mechanics, cache durations, internal identifier names or field lists: retention is a promise ("deleted
  within 24 hours"), identifiers are plain words ("a random identifier for your installation, not your
  Apple ID"). Model the voice on `src/data/support.ts`.
- `/terms` section 6 is the App Store 3.1.2(c) auto-renewable block (weekly and yearly), section 7
  the one-time Lifetime purchase (does not renew, does not cancel a running subscription), and
  section 1 links Apple's Standard EULA, and `#apple` carries Apple's minimum EULA terms. No free trial is offered on
  any plan. Both are submission requirements, and `check-legal` asserts 6 and 7 keep their numbers and titles. The
  layout numbers sections by order; cross-references come from the same order (`legalSections` in
  `src/data/sections.ts`, `privacySection` for /support), never a typed number.
- **One wording for app 1.0 and v2 (spec 013, founder 2026-10-15).** Every line of /terms and /privacy holds both for
  app 1.0 (free searches counted on the device, no accounts) and for v2 (accounts, new limits, partner offers): a
  v2-only feature is conditional ("if you sign in", "ffly may show"), never a present-tense promise.
  - No free-search count on either page (`check-legal` rejects one): /terms says "Free searches and trip size are
    limited; the current limits are shown in the app and on the site." in the summary and `#free-and-pro`.
  - /privacy `#account` (sign-in through "our sign-in service, with Apple or Google": email address, possibly an Apple
    private relay address, and an account identifier) and `#partner-offers` ("ffly may earn a commission"); quotas are
    counted "per device (your installation), per account if you sign in, or per IP address".
  - /terms `#not-a-travel-agent` says "Partners don't pay for placement; routes follow the priority you choose."
  - No partner, no "OverX" and no auth host on either page: partners are "a flight booking partner" and "hotel, eSIM,
    travel insurance and airport transfer partners"; `TRIP_KIT_PARTNERS` in `check-legal` joins the vendor bans.
- **Operator placeholders gate publishing (spec 011).** `check-legal` fails `npm test` on any `REPLACE_ME` in
  `src/app.ts`'s operator constants. `GOVERNING_LAW` is the Republic of Belarus; `EU_REPRESENTATIVE` / `UK_REPRESENTATIVE`
  are empty until the owner appoints them (2026-10-07), and /privacy then leaves `#representatives` out rather than
  claim one. Both legal pages show "Effective: … · Last updated: …", both the `SITE_PAGES` lastmod.
- Copy was ported from the overx.ai worktree (`sites/main/src/content/ffly/*.ts`) on 2026-10-03.
  **This repo is now the source of truth**; do not re-extract.

## Copy rules
- **Never "unlimited".** Pro has a fair-use cap. The 1.0 Pro line is "Every route in full, and no 3-search limit"; v2's
  is "The lowest fares we find", and Free's says "partner fares".
- **Never name where fares come from**, in any language (founder, 2026-10-17); `check-legal` fails on the known English
  phrasings on any page. Pro sells on price: "often finds the same trip for less".
- **No web search count in copy** (spec 016): the web's limit is `/meta`'s. `check-legal` fails on a web search count on
  any English page or in `llms.txt`, except the home FAQ's, which must equal `web-meta.json`'s window. Support, guides
  and `llms.txt` name no count at all, so they hold for 1.0 and v2.
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
  site". Never name a data source, partner or vendor (Aviasales, Travelpayouts, the Trip kit partners, Telegram,
  Vercel...) on any page, the legal ones included (only the processors above, on /privacy and /terms): they say "a
  booking partner" and disclose its cookies, the partner identifier and the commission. Carriers are not named on the home, search and guides-index pages (any language) or in
  `llms.txt` (`CARRIERS` in `scripts/check-legal.mjs`); the guides and legal pages may name them, and search
  results show the carriers the API returns.
- **Value, not mechanics**, on every page: no cache, Keychain, server, memory, database, background,
  bundle id, endpoints or the API host, nor search limits such as "up to 8" cities. `MECHANICS` and
  `COPY_BANS` in `scripts/check-legal.mjs` ban them on every page (legal included), in `llms.txt`, and,
  except the API host, its URL and "HTTPS", in the JS bundle.
- **Never "cheapest guaranteed"** (or lowest), in any language: `check-legal` fails on a guarantee word and a
  cheapest or lowest word in one sentence (`GUARANTEED`, `CHEAPEST`).
- **No em dashes in published copy.** British spelling, and each language's `tag` in `src/i18n/locales.ts`
  (`en-GB` for English) for every date and number.
  `npm test` fails on an em dash or "unlimited" (any language) on any page or in `llms.txt`.

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
  computed at build time there from `src/data/europe-map.json` (regenerate: README); the fly is a CSS `transform`
  animation sampled from the legs at build time (`fly-route`), so it runs on the compositor and needs no JavaScript.
  Never use SMIL `<animateMotion>` there: it re-laid out the page every frame, off screen too (`check-legal` bans it). Label offsets there are hand-placed for
  `EXAMPLE_TRIP`: a new example needs new ones, and a new city needs a point in `scripts/europe-map.py`.
- Fonts are self-hosted latin and latin-ext woff2 (split by `unicode-range`) in `public/fonts/`, plus cyrillic subsets
  (spec 010): Onest after Bricolage and Figtree in the stacks, and IBM Plex Mono's own; only a page with Cyrillic text
  fetches them, and footer links in another script use the system font. Bricolage Grotesque (display), Figtree (body),
  IBM Plex Mono (data). They are cached immutably by name, so **a changed font file gets a new name**. Bricolage is
  cut to weights 700-800 (`scripts/fonts.py`): never ask the display font for a lighter weight.
- `og:image:width/height` in `BaseLayout` match `public/og-image.jpg` (1200x675). Change both together.
- **No `favicon.svg`**: an SVG icon silently outranks every PNG.
- Hyphenated words in large headings go in `<span class="nw">` so they do not break at the hyphen.

## Workflows
- Verify: `npm test` (vitest, build, then `scripts/check-legal.mjs`), then the checks in README "Verification".
- Preview: `npm run preview`, read every page at 390px and 1280px in both colour schemes.

## Code comments
- **A comment is written only when it is essential to understanding intricate logic.** No
  boilerplate docstrings, never a comment "just in case". A wrong comment is worse than none.
