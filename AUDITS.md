# Audit ledger

| Service | Path | Last audited commit | Audited on | Deps | Findings |
|---------|------|---------------------|------------|------|----------|
| (root) | . | 9b255c85 | 2026-10-04 | b414579 @ 2026-10-04 (npm audit --omit=dev: 11 via astro 4.16.19, 1 critical + 9 high, none reachable on the static output → T-001) | 2 bugs (001 high: Terms forbid the web search; 002 high: Search History linkage, follows ios-ffly bug 002), 0 specs, 15 backlog (T-001–T-015). Verified: no XSS sink (API data via `textContent`/`<template>` only), no secrets or client id in the bundle, privacy labels match PrivacyInfo, Terms meet 3.1.2(c), search error mapping and replay-safe retry correct, SEO and AA contrast pass |
