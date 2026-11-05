---
id: 019
title: "The privacy policy covers search alerts"
status: done
priority: p1
created: 2026-11-05
updated: 2026-11-05
repo: ffly-site
---

# 019: privacy policy covers search alerts

> **TL;DR** — `/privacy` now has a Search Alerts section: the push token, Apple's push service, how long a followed search stays and how to stop it. The app's `LegalLinks.currentVersion` must carry this page's date, 2026-11-05. `check-legal` guards the wording.

**Related**: [011 - Legal pages](011-legal-pages-bulletproof.md), ios-ffly specs 039 and 040, 1B-bots spec 620.

## Why
The policy said every app search goes within 24 hours and that the only push token was a Live Activity's. A followed search and the device's push token break both claims.

## Changes
- **File**: `src/data/privacy.ts`, new `search-alerts` section, plus the summary, legal bases, Apple's processor line, retention, on-device and web search entries.
- **File**: `src/data/support.ts`, the delete-your-data answer.
- **File**: `scripts/check-legal.mjs`, the wording checks.

## Known limit
notifications-api has no automatic expiry for a device token, so the policy says it stays until the account goes or the user asks. Filed in 1B-bots as a bug.
