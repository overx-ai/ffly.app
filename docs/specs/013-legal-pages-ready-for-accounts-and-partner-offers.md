---
id: 013
title: "Legal pages ready for accounts and partner offers"
status: approved
priority: p1
created: 2026-10-15
updated: 2026-10-15
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
source: META_STATE bridges/012-1b-bots-to-0e-extensions--ios-ffly.md
---

# 013 - Legal pages ready for accounts and partner offers

> **TL;DR** - /terms and /privacy hold true for both app 1.0 and v2: no free-search count, optional Apple or Google
> sign-in, partner offers (unnamed) that may earn ffly a commission, and the partner script only after cookie consent.
> `npm test` enforces it. Owner: publish before the iOS 1.0, at least 30 days ahead of accounts.

**Amendment (founder, 2026-10-15), overrides anything below that disagrees:**
- **Generic wording.** No partner names and no "OverX" or auth host anywhere on /terms or /privacy. Partners are "a
  flight booking partner" and "hotel, eSIM, travel insurance and airport transfer partners"; sign-in is "our sign-in
  service, with Apple or Google". Today's check-legal bans (`MECHANICS`, the OverX ban) stay whole: no exceptions.
- **The partner script is gated.** The owner confirmed on 2026-10-15 that the network's site verification is done.
- **Ranking.** /terms `#not-a-travel-agent` adds: "Partners don't pay for placement; routes follow the priority you
  choose." 

**Related**: [011 - Privacy and terms, bulletproof](011-legal-pages-bulletproof.md) (the structure and gates this
extends), [004 - Localization and analytics](004-localization-and-analytics.md) (the consent banner).

## Requirements
Founder, 2026-10-15 (bridge 012, approved): the iOS app links to these pages, and the policy "can be changed in
advance". **Ships first, before the iOS 1.0 is published.** Every sentence must be true **today** (app 1.0: free
searches counted on the device, no accounts, no offers beyond Book links) **and in v2** (accounts, new limits, partner
offers). A v2-only feature gets a conditional sentence ("if you sign in", "ffly may show"), never a present-tense promise.

Copy rules (all three specs 013-015): never "unlimited", never "cheapest guaranteed", never name where fares come from
(fare sources and scoring are confidential). House rules from CLAUDE.md hold: no em dashes, British spelling, no
mechanics (no field names, endpoints or storage details) on legal pages.

**Terms (`src/data/terms.ts`)**
- R1 **No free-search count.** The summary (lines 37-42) and `#free-and-pro` drop `APP.freeSearches` and
  `WEB_SEARCH.freeSearchesPerDay`. Both say: "Free searches and trip size are limited; the current limits are shown in
  the app and on the site." The Free bullet keeps "every route in full" (true in 1.0 and v2; check-legal asserts it)
  and the reinstall sentence. The Pro bullet replaces "no N-search limit" with higher limits under the existing
  fair-use sentence. The web bullet loses its count and its description of which route details the web shows. No
  per-plan fare coverage on /terms: it differs between 1.0 and v2, and the plan comparison lives in the app and on the
  site.
- R2 **Prices "as shown at purchase"** in `#subscriptions` and `#lifetime`.
- R3 **Pro on the website.** `#free-and-pro`: "${APP.proName} also applies to the web search on ${SITE_HOST} if you sign
  in with the same account."
- R4 **Partner offers.** The partner paragraph of `#not-a-travel-agent` adds: ffly may also show offers from partners,
  such as hotels, eSIMs, travel insurance and airport transfers; if you buy through one, ffly may earn a commission, at
  no extra cost to you, and that partner's terms apply. No partner names on /terms.
- R5 **Termination.** `#termination`: if you signed in, you can delete your account in the app's Settings or by
  writing to `CONTACT_EMAIL`.

**Privacy (`src/data/privacy.ts`)**
- R6 **New `#account` section, "Signing In".** Optional sign-in with Apple or Google, through our sign-in
  service. What is kept: an email address (with Sign in with Apple, possibly a private relay address Apple
  forwards to you) and an account identifier. Why: to apply your plan and limits wherever you sign in, in the app and on
  the website. How long: while the account exists, deleted when you delete it, except what the law requires us to keep
  (no number of days unless 1B-bots spec 573 states one). How to delete: in the app's Settings, or by writing to
  `CONTACT_EMAIL`. On this website, Apple's and Google's sign-in tools load only when you choose to sign in, and signing
  out removes the website's sign-in cookie.
- R7 **New `#partner-offers` section, "Partner Offers".** ffly may show offers from partners: a flight booking
  partner, and hotel, eSIM, travel insurance and airport transfer partners (unnamed). Opening one takes you to that partner's site, whose terms and privacy policy apply and
  which may set its own cookies; "ffly may earn a commission", at no extra cost to you. Clicks are counted with an
  anonymous tag naming the platform (the app or this website) and the place the offer was shown: the same for every
  ffly user, never anything that identifies you. In plain words, as the house rule requires: never the field name
  `sub_id`. No partner is named.
- R8 **Quotas.** `#app-user-id`, `#ip-address`, `#on-device` and `#retention` say free searches and the fair-use limit
  are counted per device (installation), per account if you sign in, or per IP address.
- R9 **Every "no account" line becomes optional sign-in**: `description`, the summary ("ffly has no account and no
  sign-in"), `#not-collected` ("No account needed"), `#rights` ("If you haven't signed in, ...", plus deleting the
  account in the app's Settings). `#app-store-labels` keeps exactly the inventory's types (check-legal reads them);
  only the parentheticals widen: Email Address "only if you add one to feedback or sign in"; User ID "a random
  identifier for your installation, or your account if you sign in, never your Apple ID".
- R10 **Recipients and bases.** `#sharing`: Apple and Google confirm who you are when you choose to sign in with them,
  as independent companies under their own policies (Google's policy link shows whether or not analytics is on); the
  `#partner-offers` partners receive what you do on their sites. `#legal-bases`: the account under performance of a
  contract. `#ccpa`: the account email and identifier join the identifiers category.

**The partner script (`AD_NETWORK_SCRIPT`, tpembars.com)**
- R11 Today `BaseLayout.astro` line 95 loads it on every page without consent (owner, 2026-10-10, for the network's
  site verification). **Founder, 2026-10-15: that is a bug.** It loads only after Accept, from the consent module, as
  gtag does: the tag leaves `BaseLayout`; `consent.ts` injects it (async, keeping `data-cmp-ab="2"`) after Accept and
  on every later page with a stored `granted`; Reject and GPC never load it; withdrawal reloads, as today. The banner
  shows while `GA_MEASUREMENT_ID` or `AD_NETWORK_SCRIPT` is set, and its text covers both purposes in all 13 languages.
  Privacy follows: `#website` says it loads only if you accept, `#legal-bases` moves it from legitimate interests to
  consent, and `#ccpa` drops the "the signal does not stop it" exception.

**Gates and docs**
- R12 `scripts/check-legal.mjs` (failing first) enforces the new required phrases and rejects a hardcoded free-search
  count (details in Architecture).
- R13 `src/site-pages.ts` lastmod for `privacy` and `terms` is the publish date (Effective = Last updated). CLAUDE.md:
  the legal rules, the `AD_NETWORK_SCRIPT` exception removed (verification done, owner 2026-10-15).

## Architecture
- Copy stays in `src/data/{terms,privacy}.ts`, facts in `src/app.ts` (CLAUDE.md). `SERVICE.authHost` is spec 014's,
  never legal copy. New ids go into `IDS` / `ALL_IDS`
  and check-legal's `TERMS_IDS` / `PRIVACY_IDS`; cross-references come from `legalSections`, never a typed number.
  `#subscriptions` and `#lifetime` keep numbers 6 and 7, so new privacy sections go after `#booking-links` and terms
  gets no new section.
- `#account` and `#partner-offers` are unconditional text: the conditional phrasing keeps them true in 1.0.
- **Consent**: one list of consented loaders in `consent.ts` (`loadAnalytics`, `loadPartnerScript`), each run only
  while its constant is set; `start()` runs while either is set. `shouldShowBanner` in `consent-state.ts` takes
  "anything to consent to" instead of the GA id (DOM-free, tested). `ConsentBanner.astro` renders while either
  constant is set. The consent cookie is then listed in `#website` whenever the banner exists.
- **check-legal** (mirrors its existing patterns):
  - required phrases: R1's limits sentence verbatim, "as shown at purchase" in `#subscriptions` and `#lifetime`, "if
    you sign in with the same account", the partner-offer commission in `#not-a-travel-agent`; `#account` names Apple,
    Google, private relay, account deletion in Settings and `CONTACT_EMAIL`; `#partner-offers` says "ffly may earn a
    commission" and names no partner;
  - **no free-search count** on /terms or /privacy: no `\d+ (free )?searches`, no `\d+-search`, no digit before "a day"
    or "per day" next to "search";
  - `MECHANICS` and the OverX ban (line 252) unchanged, with no exceptions;
  - `AD_NETWORK_SCRIPT`: no page's HTML references its host (inverts lines 403-405); the bundle carries it exactly
    while set; the CSP keeps its host while set; `#website` says it waits for consent; `#ccpa` has no GPC exception;
  - the banner checks (lines 436-450) and the consent-cookie filter (lines 201-203) key on "GA or partner script set".

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| A sentence true only in v2 ("you can sign in") ships with 1.0 | false statement to App Review and users | conditional phrasing; review every changed line against both 1.0 and v2 before merge | founder |
| Accounts are a new kind of data, and `#changes` promises 30 days' notice | v2 launches in breach of the policy's own clause | publish this spec at least 30 days before accounts go live; Effective date = publish date | privacy `#changes` |
| The partner network re-checks site verification behind the banner | the network may flag ffly.app | owner confirmed verification done (2026-10-15); if it lapses, that is a new owner decision, never a silent un-gate | CLAUDE.md, owner 2026-10-10 |
| Home, /support, `llms.txt` and two guides still say "3 searches" | none for 1.0 (true); stale in v2 | out of scope: they describe the shipped app and change with the v2 release; the count ban covers /terms and /privacy only | audit |
| auth.overx.ai stores more than email and id (a name, say) | `#account` incomplete | the field list follows what 1B-bots spec 573 stores; scope `email` only on the web (spec 014) | 573 |
| A label set change in ios-ffly v2's inventory | check-legal fails on `#app-store-labels` | expected: change both in lock-step then, as 011 requires | 011 |

## Cross-Repo Interfaces
| Direction | Contract | Pinned version | Owner repo/spec | Fallback until available |
|-----------|----------|----------------|-----------------|--------------------------|
| consumes | auth.overx.ai account data: fields kept, retention and deletion path | 2026-10-15 | 1B-bots spec 573 | `#account` states no number of days and lists email and account id only |
| consumes | partner link tag: platform + placement, never a person | ffly API 1.12.0 | 1B-bots spec 574 | today's links carry the ffly-wide partner id; the copy is true for both |
| consumes | ios-ffly `docs/compliance/data-inventory.yaml` App Store labels (unchanged) | 2026-10-07 | ios-ffly spec 024 | `PINNED_LABELS` in check-legal |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| T1 | check-legal: every Architecture assertion, seen failing on the current build first | dev | - | todo | scripts/check-legal.mjs |
| T2 | Terms R1-R5 | dev | T1 | todo | src/data/terms.ts |
| T3 | Privacy R6-R10 and R11's copy (generic wording) | dev | T1 | todo | src/data/privacy.ts |
| T4 | Partner script behind consent: tag out of `BaseLayout`, consented loaders, banner while either constant is set, banner text in 13 languages, tests | dev | T1 | todo | src/layouts/BaseLayout.astro, src/scripts/consent.ts, src/scripts/consent-state.ts, src/components/ConsentBanner.astro, src/i18n/{en,de,fr,es,it,nl,pl,pt,ru,sv,da,nb,fi}.ts, tests/consent.test.ts |
| T5 | lastmod; CLAUDE.md (legal rules, consent exception removed, dated exceptions); `AD_NETWORK_SCRIPT` comment in `src/app.ts` | dev | T2, T3, T4 | todo | src/site-pages.ts, CLAUDE.md, src/app.ts |

## Acceptance Criteria
- [ ] /terms and /privacy show no number of free searches; R1's sentence appears in the summary and `#free-and-pro`.
- [ ] Every changed sentence was read against app 1.0 (no accounts, device-counted free searches) and v2, and holds in both.
- [ ] /privacy names the eight partners in `#partner-offers` only; no other page, `llms.txt` or the bundle names them.
- [ ] No built page references tpembars.com; in a headless browser it is requested only after Accept, never after Reject or with GPC, and on later pages only with a stored `granted`.
- [ ] The banner shows with `GA_MEASUREMENT_ID` unset and `AD_NETWORK_SCRIPT` set, in all 13 languages.
- [ ] `npm test` green; each new check-legal assertion seen failing on a tampered build.
- [ ] Code review clean.
