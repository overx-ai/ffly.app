---
id: 002
title: "Privacy policy: the in-app feedback form"
status: done
created: 2026-10-04
updated: 2026-10-04
repo: ffly-site
tasks: [T1]
depends_on: []
conflicts_with: []
source: ios-ffly docs/specs/012-feedback-form.md (and docs/releases/feedback-form-2026-10-03.md, owner step 2)
---

# 002 - Privacy policy: the in-app feedback form

> **TL;DR** — ffly 012 adds a feedback form that sends the message, device details, the anonymous app user id
> and an optional email address to OverX's form-aggregator, which stores it and forwards it to a Telegram chat.
> `/privacy` said "we do not collect your email address" and "Data linked to you: none". Both were wrong for a
> build with the form. The page now has a "Feedback You Send" section (Section 8) and matches the app's
> `PrivacyInfo.xcprivacy` and data inventory again. Effective date: October 4, 2026.

## Why
The privacy page must list exactly what `ios-ffly/Template/PrivacyInfo.xcprivacy` and
`docs/compliance/data-inventory.yaml` declare. Spec 012 added two linked types, Email Address and Customer
Support, so the page contradicted the app and its App Store privacy answers.

## What changed
| Where | Change |
|-------|--------|
| `src/app.ts` | `FEEDBACK` (form service host, offline queue 20 messages / 7 days), `EXTERNAL.telegramPrivacy`, `LEGAL_EFFECTIVE_DATE` → October 4, 2026 |
| `src/site-pages.ts` | `/privacy` `lastmod` → 2026-10-04 |
| `privacy.ts` header comment | Lists linked and not-linked types |
| summary | Email only if you add it to feedback; feedback goes to our form service and Telegram |
| `who-we-are` | The policy also covers the form service |
| `not-collected` | "No account" no longer claims we never hold an email address |
| `app-user-id` | The id also groups feedback from one installation |
| `analytics` | Adds `search_priority_chosen`, `onboarding_page_viewed`, `onboarding_answered` (already shipped, missing here), `feedback_submitted`, `feedback_prompt_shown`, `feedback_prompt_action` and their properties |
| `feedback` (new, Section 8) | What is sent, why, where (database, logs, Telegram), linked to you, retention, deletion, offline queue |
| `on-device` | Feedback prompt state |
| `app-store-labels` | Linked: Email Address (Contact Info, optional), Customer Support (User Content) |
| `legal-bases`, `sharing`, `rights` | Feedback basis, form service and Telegram as recipients, deletion on request |
| `CLAUDE.md` | The legal-coupling rule lists seven types |

New section is inserted after `analytics`, so the existing "Section 6" (RevenueCat) references still hold.

## Sources (every claim traces here)
- App, branch `feat/012-feedback-form`: `Core/Models/FeedbackModels.swift` (wire body, text footer, search
  context line, queue rules), `Core/Services/FeedbackService.swift`, `Core/API/APIConfig.swift`
  (`https://api.overx.ai/forms/submit`), `Features/Settings/FeedbackFormModel.swift` and
  `FeedbackPromptSheet.swift` (analytics properties), `Template/PrivacyInfo.xcprivacy`,
  `docs/compliance/data-inventory.yaml`.
- form-aggregator, `1B-bots` `origin/master` `shared/form-aggregator`: `main.py` (stores IP address and user
  agent, logs the submission, forwards to Telegram), `services/storage.py` (SQLite `submissions`),
  `services/telegram.py` (fields forwarded, values cut at 500 characters), `services/spam.py` (per-IP rate
  limit, 5 per minute, in memory), `schemas.py`.

## Retention
form-aggregator has no retention or cleanup job for stored submissions. The page therefore states no number of
days: feedback is kept as long as needed to handle it, and is deleted on request.

## Open points (not in this repo)
- ios-ffly: the inventory's `customer_support.fields` does not mention the search context line (place codes,
  date window). The page discloses it; the inventory row should list it too.
- ios-ffly / ASC: User ID and Search History stay "not linked" in the manifest, while feedback carries the app
  user id next to an optional email, and a search's codes and dates. The page keeps the manifest's labels.
- `LEGAL_EFFECTIVE_DATE` is shared with `/terms`, whose copy did not change.
