# ffly-site Documentation Index

## Quick Links
- [README](../README.md): pages, local commands, verification
- [CLAUDE.md](../CLAUDE.md): rules for every session (fixed URLs, facts, legal coupling, copy rules)
- [001 - Deployment](001-deployment.md): Vercel project, Namecheap DNS, go-live checks
- [Spec 001 - Web search](specs/001-search-web-app.md): `/search`, the free web search on ffly API v1.2
- [Spec 002 - Privacy: feedback form](specs/002-privacy-feedback.md): `/privacy` Section 8, linked Email Address and Customer Support

## Documentation Tree
```
README.md (overview + verification)
├── CLAUDE.md (conventions)
└── docs/001-deployment.md (host + DNS)
    ├── vercel.json
    └── src/site-pages.ts (the URLs the deploy must serve)
```

## Cross-project
- App: `../../0E-extensions/ios-ffly` (`Template/PrivacyInfo.xcprivacy`,
  `docs/compliance/data-inventory.yaml`, `Template/Core/Constants/LegalLinks.swift`,
  `fastlane/metadata/en-US/*_url.txt`)
- API: `1B-bots` `apps/ffly-api` (`config.py` retention values)
- Feedback: `1B-bots` `shared/form-aggregator` (storage, Telegram forward; no retention job)
- Sibling sites: `../refresher` (tryrefresher.app), `../new-moon` (trynewmoon.app), `../vocele-web` (vocele.app)

## Orphans
- none

---
*Last updated: 2026-10-04 (privacy: feedback form)*
