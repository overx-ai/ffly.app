---
id: 002
title: "The privacy page says searches are not linked to you, beside a linked User ID"
status: open
severity: high
created: 2026-10-04
updated: 2026-10-04
source: audit
repo: ffly-site
files: src/data/privacy.ts
---

# BUG 002 - The privacy page says searches are not linked to you, beside a linked User ID

> **TL;DR** — privacy.ts:75 says trip searches "are not linked to your identity" and :222 lists Search History as not linked, while User ID is now linked and travels with every search. The site must follow ios-ffly bug 002, whose safe default is to declare Search History linked. Fix together with that bug, so the site, PrivacyInfo and App Store Connect agree.

## Symptom
- `src/data/privacy.ts:75`: "…They are not linked to your identity."
- `src/data/privacy.ts:222`: Search History under "Data not linked to you".
- Same file, after 9b255c8: User ID under "Data linked to you"; Section 8 says search feedback sends places and dates with the user id and email.

## Root cause
9b255c8 moved User ID to linked without re-checking the data that travels with it.

## Fix
When ios-ffly bug 002 lands (default: Search History linked): move Search History to the linked list at :222, rewrite :75 to say searches carry the app user id and are kept in memory up to 24 h, and update the header comment at :15-18.

## Regression test
A unit test over `PRIVACY` that the linked/not-linked lists equal ios-ffly `docs/compliance/data-inventory.yaml` (copied as a fixture). Fails once the inventory is updated.
