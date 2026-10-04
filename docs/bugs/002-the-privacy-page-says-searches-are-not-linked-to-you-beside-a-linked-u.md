---
id: 002
title: "The privacy page says searches are not linked to you, beside a linked User ID"
status: fixed
severity: high
created: 2026-10-04
updated: 2026-10-04
source: audit
repo: ffly-site
files: src/data/privacy.ts, scripts/check-legal.mjs, package.json, CLAUDE.md, README.md
---

# BUG 002 - The privacy page says searches are not linked to you, beside a linked User ID

> **TL;DR** — privacy.ts:75 said trip searches "are not linked to your identity" and :222 listed Search History as not linked, while User ID was linked and travelled with every search. Fixed to match ios-ffly's PrivacyInfo and data inventory: Search History and Purchase History moved to "Data linked to you", the searches and purchases sections say why (the anonymous app user id), and the header comment and the rights section were brought in line.

## Symptom
- `src/data/privacy.ts:75`: "…They are not linked to your identity."
- `src/data/privacy.ts:222`: Search History under "Data not linked to you".
- Same file, after 9b255c8: User ID under "Data linked to you"; Section 8 says search feedback sends places and dates with the user id and email.

## Root cause
9b255c8 moved User ID to linked without re-checking the data that travels with it. Every trip search is sent with the app user id, so if the id is linked the searches it rides on are linked too; the page still declared them unlinked in three places (header comment, the searches section, the App Store labels) and the rights section relied on "apart from feedback the data we receive is not linked".

## Fix
- `src/data/privacy.ts:16-22`: header comment lists Linked: Search History, Purchase History and User ID (every search carries the app user id, RevenueCat keeps purchases under it, feedback can pair it with an email), Email Address and Customer Support; Not linked: Product Interaction, Device ID.
- `src/data/privacy.ts:76-79`: searches stay in server memory for at most `SERVICE.searchRetentionHours` hours, "Each search carries your anonymous app user id (Section 4), so we treat your searches as data linked to you."
- `src/data/privacy.ts:120-122`: purchases section: "RevenueCat keeps them under your app user id, so we treat your purchase history as data linked to you."
- `src/data/privacy.ts:224-229`: "Data linked to you: Search History (trip searches, which carry the app user id), Purchase History (kept by RevenueCat under the app user id), User ID, Email Address, Customer Support"; not linked: Product Interaction, Device ID.
- `src/data/privacy.ts:261-263`: the rights line no longer claims non-feedback data is unlinked: "ffly has no account and never asks your name, so unless you added your email address to feedback we usually cannot tell which records are yours."
- `CLAUDE.md:38-42`: the cross-repo list of linked and not-linked types updated to match.
- The web search section (Section 18) is unchanged: it sends no app user id.

The App Store Connect privacy answers must still be updated to Search History and Purchase History linked when ios-ffly bug 002 ships; that is outside this repo.

## Regression test
`scripts/check-legal.mjs:40-47` asserts the built `/privacy` linked list contains Search History, Purchase History, User ID, Email Address and Customer Support and the not-linked list contains Product Interaction and Device ID (each absent from the other list); `scripts/check-legal.mjs:49` asserts the searches section no longer says "not linked to your identity". A section missing from the build fails the run. Run by `npm test`. Three checks failed before the fix and all pass after. (The inventory-fixture test in the original note was not used: it would copy another repo's file into this one.)
