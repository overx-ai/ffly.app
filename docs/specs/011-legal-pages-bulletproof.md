---
id: 011
title: "Privacy and terms, bulletproof and in lock-step with the app"
status: done
created: 2026-10-07
updated: 2026-10-08
repo: ffly-site
release:
depends_on: []
conflicts_with: []
tasks: []
---

# 011 - Privacy and terms, bulletproof and in lock-step with the app

> **TL;DR** — `/privacy` contradicts the app (says "no tracking"; the app uses the IDFA after ATT and declares 9 data
> types), and both pages lack GDPR/CCPA/Apple basics. They are rewritten to match ios-ffly's manifest and its new
> AppsFlyer attribution, name the vendors, show the owner's name and Minsk address, and use Belarus law. Owner: appoint
> EU/UK Art. 27 representatives (the section stays hidden until then) and get a lawyer's read.

> **Amended 2026-10-08 (owner):** the pages no longer show the postal address or a phone number; both offer the
> address on request by email. `OPERATOR_ADDRESS` and `OPERATOR_PHONE` are gone, and `check-legal` fails on either
> shape in any built page or `llms.txt`. The TL;DR's "Minsk address", S3's "postal address" and S6's
> `OPERATOR_ADDRESS` below are superseded.

## Requirements
- Owner, 2026-10-07: "make our privacy and terms bulletproof … check the bible". Answers: name the vendors; operator
  details as placeholders that block release.
- S1 Privacy matches ios-ffly's `PrivacyInfo.xcprivacy` + `docs/compliance/data-inventory.yaml`: 9 types; Device ID
  linked and used for tracking (the IDFA only after ATT "Allow"); Crash Data, Performance Data, Product Interaction not
  linked. New sections: advertising attribution (`#attribution`, AppsFlyer, SKAdNetwork, Apple Search Ads token,
  EEA/UK/CH off unless "Ad measurement" is on, how to withdraw), crash and performance data, Live Activity push token.
- S2 Named recipients on `/privacy` and `/terms` only: Apple, RevenueCat, AppsFlyer, Google (site analytics, consent
  only); hosting by category; each with role, data and policy link; processors bound to equal protection (Apple 5.1.1).
- S3 GDPR/UK GDPR: controller name, postal address, country; EU and UK Art. 27 representatives; legal basis per
  purpose; retention per category (no invented numbers); transfers (controller outside the EEA/UK; SCCs + UK
  Addendum); rights incl. portability, consent withdrawal, one-month response, identity check, DPA complaint; no
  automated decisions; children under 13 (16 in the EEA/UK); 30-day notice; shown effective date.
- S4 CCPA/CPRA: categories collected and disclosed; IDFA attribution is "sharing" and ATT is the opt-out; GPC honoured
  on the site; no sale for money; no sensitive data.
- S5 Terms: Free copy fixed (full results, 3 searches; closes T-023); Apple EULA clauses; EU/UK 14-day withdrawal and
  digital-content waiver; Apple refund link; price changes at next renewal; governing law and disputes as placeholders
  with the consumer carve-out and EU ODR link; liability with the mandatory-law carve-out; 30-day change notice;
  severability, assignment, entire agreement. Sections 6 (auto-renew) and 7 (Lifetime) keep their numbers.
- S6 `OPERATOR_ADDRESS`, `EU_REPRESENTATIVE`, `UK_REPRESENTATIVE`, `GOVERNING_LAW` = `REPLACE_ME` in `src/app.ts`;
  `check-legal.mjs` fails `npm test` while any is `REPLACE_ME`.
- S7 `check-legal.mjs` asserts the new truth (labels from the app's inventory when the sibling is checked out, tracking
  statement, vendor names allowed on the legal pages only, new section ids); CLAUDE.md rule rewritten; lastmod bumped.

## Architecture
- Copy in `src/data/{privacy,terms,support}.ts`, facts in `src/app.ts`, dates in `src/site-pages.ts` (CLAUDE.md).
- Structure from Vocele's published pages (`3FRONT/vocele-web/src/pages/{privacy,terms}.astro`), facts from ffly.
- House style: British spelling, no em dashes, never "unlimited", no prices.

## Edge Cases & Risks
| Case | Impact | Mitigation | Source |
|------|--------|------------|--------|
| Page drifts from the app manifest again | 5.1.1 rejection | labels read from the app's inventory in check-legal | audit |
| Placeholders shipped | invalid notice | REPLACE_ME fails `npm test` | owner |
| Vendor names leak to marketing pages | house rule | ban kept outside /privacy and /terms | CLAUDE.md |
| Section renumbering | broken cross-refs ("Section 6") | 6 and 7 fixed, test asserts | CLAUDE.md |

## Tasks
| ID | Description | Agent | Depends On | Status | Files |
|----|-------------|-------|------------|--------|-------|
| S-T1 | check-legal assertions + placeholder gate, failing first | dev | - | done | scripts/check-legal.mjs |
| S-T2 | Privacy rewrite | dev | S-T1 | done | src/data/privacy.ts, src/data/types.ts, src/app.ts |
| S-T3 | Terms rewrite, Support Free copy | dev | S-T1 | done | src/data/terms.ts, src/data/support.ts |
| S-T4 | lastmod, CLAUDE.md, docs/000-tasks | dev | S-T2, S-T3 | done | src/site-pages.ts, CLAUDE.md, docs/000-tasks.md |

## Cross-Repo Interfaces
| Direction | Contract | Pinned version | Owner repo/spec | Fallback until available |
|-----------|----------|----------------|-----------------|--------------------------|
| consumes | ios-ffly `docs/compliance/data-inventory.yaml` + AppsFlyer (spec 024) | 2026-10-07 | ios-ffly spec 024 | pinned copy of the labels in check-legal |

## Acceptance Criteria
- [x] Every label, tracking and processor statement matches the app's inventory.
- [x] All S3–S5 sections present; check-legal asserts them.
- [x] `npm test` green; the REPLACE_ME gate stays for any future placeholder.
