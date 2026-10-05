---
id: 004
title: "ffly.app in eight languages, and analytics behind consent"
status: in-progress
created: 2026-10-05
updated: 2026-10-05
repo: ffly-site
release:
depends_on: []
conflicts_with: []
tasks: [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]
source: owner, 2026-10-05: "fully localize the site for the main european languages that our app also has. ensure we don't have issues with the canonicals. terms, privacy and support are always english"; languages: core 7; guides: UI pages only; GA4 G-JYLD2DWSJG: "let's do it properly"
---

# 004 - ffly.app in eight languages, and analytics behind consent

> **TL;DR** - Home, `/search` and `/guides` get German, French, Spanish, Italian, Dutch, Polish and Portuguese versions
> under `/de` … `/pt`, self-canonical with reciprocal hreflang; legal pages, support and guide articles stay English.
> Google Analytics loads only after a visitor accepts the consent banner. Owner: set GA4 retention and signals.

## Requirements
1. **Languages:** en (root, unchanged, `en-GB` formats), de, fr, es, it, nl, pl, pt-PT. Paths `/de` `/fr` `/es` `/it` `/nl` `/pl` `/pt`.
2. **Localized pages:** `/`, `/search` and `/guides` (index). The guide articles, `/support`, `/privacy`, `/terms` and the 404 stay English-only at the root. The guides index lists the English guides, marked as English (`hreflang="en"` links, a localized "in English" note).
3. **Canonicals:**
   - Every page is self-canonical.
   - Localized pages carry a reciprocal hreflang set: `en de fr es it nl pl pt-PT` plus `x-default` → the English root URL.
   - English-only pages carry no alternates.
   - `sitemap.xml` lists every localized URL with `xhtml:link` alternates identical to the head.
   - No redirect by Accept-Language or IP.
   - The footer has a plain-link language switcher (native names) to the same page in each language. On English-only pages it points at each language's home.
4. **Root URLs are unchanged.** The iOS app and the App Store point at `/`, `/support`, `/privacy` and `/terms`.
5. **All copy on a localized page is in that language:**
   - header, footer, CTAs, store badge, search widget (labels, placeholders, aria, messages, nudges, notifications), boarding pass, map labels, FAQ, JSON-LD text, `<title>` and description, `og:locale`.
   - Legal links keep localized labels and point at the English pages (`hreflang="en"`).
   - City and place names stay English, as in the app and the API.
   - Dates and numbers use the language's BCP-47 locale: calendar, month and weekday names, currency, "Searched" date.
6. **Copy rules hold in every language:**
   - no em dash;
   - no word for "unlimited";
   - value, not mechanics;
   - no prices beyond the dated example;
   - no vendor or data-source names;
   - "More cities in the app" with no number;
   - airline and brand names untranslated.
   - Shared terms reuse the app's translations (`ios-ffly/Scripts/l10n/{lang}.json`) and its register (informal German "du").
7. **Analytics (GA4 `G-JYLD2DWSJG`), consent first:**
   - A first-party banner on every page, translated: a short purpose line, equal-weight Accept and Reject buttons, and a link to `/privacy#website`.
   - Nothing is requested from Google before Accept (Consent Mode v2, basic).
   - Accept stores `ffly_consent=granted` for 6 months and loads gtag with `analytics_storage` granted, ad storage, ad user data and ad personalization denied, and Google signals and ad personalization signals off.
   - Reject stores `denied` and loads nothing.
   - A footer "Cookie settings" control reopens the banner. Withdrawing deletes the `_ga*` cookies.
8. **Privacy `#website`** (English, by category) covers analytics after consent through "an analytics provider": what it measures, the choice cookie, how to withdraw, and consent as the legal basis.

## Architecture
- **`src/i18n/locales.ts`:** `LANGS`, one row per language with code, path prefix, `hreflang`, BCP-47 tag, `og:locale` and native name; `DEFAULT_LANG = 'en'`.
- **`src/i18n/en.ts`:** the source dictionary, nested by surface (`common`, `home`, `search`, `widget`, `pass`, `map`, `guides`, `consent`, `schema`).
- **`src/i18n/{lang}.ts`:** each `satisfies Dict` (`Dict` derived from `en`), so a missing key fails `tsc` and the build.
- **Plurals:** `{one?, few?, many?, other}` resolved with `Intl.PluralRules(tag)`.
- **`useLang(lang)`:** returns `{ t, tag, fmt }`. The copy-bearing constants in `src/app.ts` move into the dictionaries. `app.ts` keeps facts only: limits, ids, cookie names, URLs, `EXAMPLE_TRIP` data (`bestTotal` as a number).
- **Page bodies:** move to `src/views/{Home,Search,GuidesIndex}.astro` with a `lang` prop. `src/pages/{index,search,guides/index}.astro` render `lang="en"`. `src/pages/[lang]/{index,search,guides/index}.astro` use `getStaticPaths` over the non-English languages.
- **`src/site-pages.ts`:**
  - `LOCALIZED_SLUGS = ['', 'search', 'guides']`
  - `pathFor(slug, lang = 'en')` gives `/de`, `/de/search`, `/de/guides`; a non-localized slug always resolves to the root path.
  - `urlFor(slug, lang)`, `alternates(slug)` (empty for non-localized), `formatDate(date, lang)`, `lastUpdated(slug, lang)`.
  - One `lastmod` per slug, shared by all languages.
- **`BaseLayout`:** takes `lang`. It renders `<html lang={tag}>`, the canonical, the alternates, `og:locale` and `og:locale:alternate`, `inLanguage` in the JSON-LD, the translated skip link, and the consent banner.
- **`sitemap.xml.ts`:** `xmlns:xhtml` plus the alternates.
- **Search widget:**
  - `SearchForm` puts that language's widget strings in a `data-i18n` JSON attribute. The CSP allows no inline script, and one bundle serves every language.
  - `search.ts` reads the attribute and `document.documentElement.lang`.
  - The DOM-free modules (`nudges`, `notify`, `calendar`, `results`) take messages or locale as arguments.
- **Fonts:** latin-ext subsets (`*-latin-ext.woff2`) of the three self-hosted families, with `unicode-range` in `@font-face`, for Polish.
- **Consent:**
  - `src/components/ConsentBanner.astro` holds the server-rendered markup, `hidden` until needed.
  - `src/scripts/consent.ts` is a small bundled module loaded on every page. Its logic is in `src/scripts/consent-state.ts`, which is DOM-free and tested.
  - gtag is defined in the module and `gtag/js` is injected only after Accept.
  - `vercel.json` CSP allows `www.googletagmanager.com` in `script-src`, and the GA collect hosts in `connect-src` and `img-src`.
  - `check-legal` keeps those hosts in `GA_CSP`, required exactly while `GA_MEASUREMENT_ID` is set. It also asserts that no static HTML references googletagmanager.
- **Ads, when they go on:** AdSense in the EEA needs a Google-certified CMP, so that step replaces this banner with Google's consent message for both ads and analytics.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| hreflang not reciprocal, or head ≠ sitemap | Google ignores the cluster | One `alternates()` feeds both; check-legal asserts reciprocity and head = sitemap | plan |
| A translation canonicalizes to English, or English-only pages get alternates | Translations dropped from the index | Self-canonical always; `alternates()` is empty for non-localized slugs; asserted | plan |
| `/de/` vs `/de` (trailing slash) | Duplicate URLs | `trailingSlash: 'never'`, `pathFor` never adds one; check-legal link check | plan |
| A missing key in one language | English or undefined leaks onto the page | `satisfies Dict` fails `tsc`; check-legal finds no `undefined` in HTML | plan |
| Polish plurals (few/many) | Wrong grammar | `Intl.PluralRules`; unit test for pl 1/2/5/22 | plan |
| German strings run long | Layout overflow in the header, table and pass | 390 and 1280 px visual pass for de and pl | plan |
| Polish glyphs missing from latin subsets | Fallback font in headings | latin-ext woff2 + `unicode-range` | plan |
| Inline JSON dictionary blocked by the CSP | Widget breaks | Data attribute, not an inline script | plan |
| `/search` copy check, `BUNDLE_COPY` and header-link checks are English or root-only | False failures or gaps | Generalize per language | plan |
| GA requested before consent | GDPR breach | Basic mode: no gtag until Accept; asserted statically, verified in the browser | plan |
| Consent cookie on English-only pages vs localized ones | Banner reappears | `Path=/`, one cookie for the site | plan |
| Ads turned on later | Two consent systems | CLAUDE.md note: Funding Choices replaces the banner | plan |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | i18n core: `src/i18n/{locales,en,index}.ts`, move all non-legal copy into `en.ts` (English output byte-identical in wording), `src/views/*`, `[lang]` routes, `site-pages` locale paths and alternates, `BaseLayout` lang, canonical and hreflang, sitemap alternates, `schema.ts` `inLanguage`, per-language `Intl`, `data-i18n` for the widget, footer language switcher, latin-ext fonts, check-legal per-language and canonical checks, vitest updates. Temporary `de`…`pt` dicts may be English copies so the build passes | dev | - | done | src/i18n/*, src/views/*, src/pages/**, src/site-pages.ts, src/layouts/*, src/components/*, src/scripts/*, src/schema.ts, src/app.ts, src/styles/global.css, public/fonts/*, scripts/check-legal.mjs, tests/* |
| T2 | Consent banner + GA4 behind consent: `GA_MEASUREMENT_ID` and `CONSENT` in `app.ts`, `ConsentBanner.astro`, `consent-state.ts` (tested) + `consent.ts`, footer "Cookie settings", CSP + `GA_CSP` check, privacy `#website` rewrite, consent strings in `en.ts` | dev | T1 | done | src/components/ConsentBanner.astro, src/scripts/consent*.ts, src/layouts/BaseLayout.astro, src/components/Footer.astro, src/app.ts, src/data/privacy.ts, src/i18n/en.ts, vercel.json, scripts/check-legal.mjs, tests/consent.test.ts |
| T3 | German dictionary `src/i18n/de.ts` | dev | T2 | done | src/i18n/de.ts |
| T4 | French dictionary `src/i18n/fr.ts` | dev | T2 | done | src/i18n/fr.ts |
| T5 | Spanish dictionary `src/i18n/es.ts` | dev | T2 | done | src/i18n/es.ts |
| T6 | Italian dictionary `src/i18n/it.ts` | dev | T2 | done | src/i18n/it.ts |
| T7 | Dutch dictionary `src/i18n/nl.ts` | dev | T2 | done | src/i18n/nl.ts |
| T8 | Polish dictionary `src/i18n/pl.ts` | dev | T2 | done | src/i18n/pl.ts |
| T9 | Portuguese (Portugal) dictionary `src/i18n/pt.ts` | dev | T2 | done | src/i18n/pt.ts |
| T10 | Per-language "unlimited" bans in check-legal, `llms.txt` language list, CLAUDE.md / README / design doc updates, visual pass (de, pl at 390 and 1280 px, both schemes) | dev | T3, T4, T5, T6, T7, T8, T9 | done | scripts/check-legal.mjs, public/llms.txt, CLAUDE.md, README.md, docs/002-design-and-guides.md |

## Acceptance Criteria
- [ ] `/de`, `/fr`, `/es`, `/it`, `/nl`, `/pl`, `/pt` (+ `/search`, `/guides` under each) are built, fully translated, with `<html lang>` set.
- [ ] Every localized page is self-canonical, with 8 hreflang links plus `x-default`, reciprocal and identical to the sitemap.
- [ ] `/support`, `/privacy`, `/terms` and the guide articles are English, self-canonical, with no alternates. Root URLs are unchanged.
- [ ] English pages read exactly as before, apart from the switcher and the consent banner.
- [ ] No request to Google before Accept. After Accept, GA collects with ads signals off. Reject and withdrawal hold across reloads.
- [ ] `npm test` green (vitest, build, check-legal), `tsc --noEmit` clean.
- [ ] Code review clean.
