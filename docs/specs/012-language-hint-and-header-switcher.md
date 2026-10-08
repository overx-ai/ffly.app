---
id: 012
title: "A language switcher in the header, and a hint offering the visitor's own language"
status: done
created: 2026-10-08
updated: 2026-10-08
repo: ffly-site
release:
depends_on: [010]
conflicts_with: []
tasks: [T1, T2, T3, T4]
source: owner, 2026-10-08 (plan good-now-fully-localize-encapsulated-bentley)
---

# 012 - Header language switcher and language hint

> **TL;DR** - A visitor whose browser asks for one of the site's 13 languages, landing on a localized page in another,
> now gets a small card in their own language offering the same page in it. It never redirects, and never shows again
> once dismissed or once a language is picked. The header gained the footer's language switcher as a globe menu.

## Requirements
1. **T1 Shared language links.** `src/components/LanguageLinks.astro` renders the footer's language links (the same page
   in each language where it has one, else that language's home; `aria-current`, `lang`, `hreflang`, the
   `other-script` system font) for both the footer and the header. The footer's output is unchanged but for the
   component's scoping attribute and a `data-lang-pick` marker on each link.
2. **T2 Header switcher.** `Header.astro` takes the page's `slug` and carries a `<details class="lang-menu">`: a globe
   and the current language's short code (`EN`, `RU`, `NO`...), named by `common.footer.languages`, opening a panel of
   `LanguageLinks` styled like the search suggestions (surface, rule, shadow, 44 px rows), two columns. No JavaScript
   needed; the page script closes it on Escape or a click outside. At 400 px and under the summary is the globe alone
   and the header gaps tighten; under 360 px the wordmark is visually hidden (the icon stays, the link keeps its name),
   because French and Russian labels did not fit beside the menu. Every `<Header>` passes its page's slug. `check-legal`: every
   page's header switcher lists every `LANGS` row in order with exactly the footer's targets.
3. **T3 Language hint.** On the localized pages only (home, `/search`, `/guides` in all 13 languages),
   `src/components/LangHint.astro` renders a hidden card with every language's `common.langHint` (`text`, `open`,
   `close`) and target URL in one `data-hints` attribute. `src/scripts/lang-hint.ts` takes the first of
   `navigator.languages` the site has (by base language; `nb`, `nn`, `no` are Norwegian) and, if it is not the page's
   and the visitor has neither dismissed the hint nor picked a language, shows the card in that language
   (`lang`, `hreflang`), linking the same page in it. The decision is the DOM-free, tested
   `src/scripts/lang-hint-state.ts`; the choice lives in `localStorage` under `LANG_HINT.storageKey` (`src/app.ts`),
   every access in try/catch. The card is fixed under the sticky header (no layout shift), tokens only, 44 px
   targets. A hint in another script than the page's (Russian on `/de`) uses the system font, so a Latin page never
   fetches Onest for it. `check-legal`: the card is present and hidden on exactly the localized pages, absent on all
   others, and no language's hint string is empty.
4. **T4 Docs.** CLAUDE.md (client JavaScript, Languages), README, `docs/002`, and `/privacy` `#website` names the
   remembered language choice.

## Edge cases
- `cs, en` on an English page: the first language the site has is English, the page's own: no hint.
- `pt-BR` gets the pt-PT page: the only Portuguese the site has.
- Storage blocked or throwing: the hint still decides and shows; the choice is just not remembered.
- Picking a language on an English-only page (support, legal, guides) is remembered too: the script runs on every page,
  the card exists only on localized ones.
- Never a redirect, by language or IP. Search engines see a `hidden` card whose links duplicate the head's alternates.

## Verification
- 2026-10-08: `tests/lang-hint.test.ts` (9 tests) seen red against a stub, then green; the new `check-legal` assertions
  seen failing on a tampered build (hint not hidden on `/`, a hint card on `/support`, a header link changed, an empty
  `pt.text`, a wrong hint target, the `/privacy` sentence removed). `npm test` (vitest 171 tests, build,
  `check-legal`) and `tsc --noEmit` green.
- Footer HTML of `/`, `/ru`, `/de/search`, `/support`, `/privacy` and the 404 byte-identical to before once the scoping
  attribute and `data-lang-pick` are stripped.
- Headless Chromium on `astro preview`: `ru-RU` on `/` showed "Эта страница есть на русском" linking `/ru` with a
  "Закрыть" close, CLS 0; ✕ hid it, stored, still hidden after reload; `ru-RU` on `/ru` and `en-GB` on `/` no hint;
  `nb-NO` on `/search` linked `/no/search`; header Русский on `/search` → `/ru/search`, on `/support` → `/ru`; Escape
  and an outside click closed the menu (focus back on the summary); picking English in the header on `/support`
  suppressed the hint on `/`; `ru-RU` on `/de` showed the hint in the system font and fetched no Onest or Cyrillic
  file. All 39 localized pages at 320 px with the hint shown and the menu open: panel, hint and header inside the
  viewport; no header overlap in any language at 320, 359, 360, 375, 390, 401 and 760 px. Screenshots at 360 and
  1280 px, light and dark, read.
- Pre-existing, not from this spec: `/fr/search` overflows by 9 px at 320 px (its heading's `.nw` span).
