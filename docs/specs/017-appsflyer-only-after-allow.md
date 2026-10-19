---
id: 017
title: "Privacy policy: AppsFlyer receives nothing before the app's tracking Allow"
status: approved
priority: p1
created: 2026-10-19
updated: 2026-10-19
repo: ffly-site
release:
story:
depends_on: []
conflicts_with: []
tasks: []
source: ios-ffly spec 038 (App Review 2.1 on ffly 1.0 build 10, 2026-10-18)
---

# 017 - AppsFlyer only after Allow

> **TL;DR** — From build 11 on, the app starts AppsFlyer only after the user taps **Allow** in the App Tracking
> Transparency prompt, in every region; before that, or after a decline, AppsFlyer receives nothing. The policy's
> `#attribution` section still says AppsFlyer gets the IDFV, IP, device model and install/open times with no Allow
> (`src/data/privacy.ts` ~243–254). Narrow the wording to match.

## Requirements

- R1: In `#attribution`, the AppsFlyer item says it receives anything only after the user chooses **Allow**, and then
  lists what it receives (the IDFA, IDFV, IP, device model and iOS version, app version, install and open times, the
  Apple Search Ads token, RevenueCat's subscription events). It also says the app asks right after the introduction.
- R2: The EEA/UK/Switzerland paragraph keeps the Ad measurement toggle and adds that both the toggle and Allow are
  needed.
- R3: SKAdNetwork and the Apple Search Ads token still work for everyone. Say so in one sentence.
- R4: `scripts/check-legal.mjs` stays green. Bumping the policy date is the owner's call; ios-ffly
  `LegalLinks.currentVersion` changes only if this is a material change.
