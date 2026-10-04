# Audit ledger

| Service | Path | Last audited commit | Audited on | Deps | Findings |
|---------|------|---------------------|------------|------|----------|
| (root) | . | a466734 | 2026-10-04 | b414579 @ 2026-10-04 (npm audit --omit=dev: 11 via astro 4.16.19, 1 critical + 9 high, none reachable on the static output → T-001) | 1 bug (003 high: the Terms promised a checked time for every fare, but cached partner fares have none), 0 specs, 5 backlog (T-016–T-020) — delta pass over 9b255c85..a466734 (more-airlines copy, partner disclosure, generic /search coverage notice). Verified: every `set:html` is build-time only, CSP and headers asserted, Travelpayouts privacy facts match ffly-api (airports + month only, ffly-wide marker), source names only in privacy/terms, /search retry and idempotent resubmit correct |
