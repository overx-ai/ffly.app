# Pins

Contracts this site codes against. Bump a row in the same change that adopts a new version.

| Dependency | Version | Source | Used by |
|---|---|---|---|
| ffly API contract | 1.3.0 | 1B-bots `docs/specs/533-ffly-channels-web-app.md` (`apps/ffly-api/contract/openapi.json`) | `src/scripts/ffly-api.ts` (spec 003) |
| ffly API shared-search lookup | 1.5.0 | 1B-bots `docs/specs/535` (`GET /searches/shared`, `searched_at`) | `lookupShared` in `src/scripts/ffly-api.ts` (spec 005) |
| ffly API web end cap | 1.5.0 | 1B-bots `docs/specs/535` T8 (`/meta` `tier_limits.max_ends` = 2 for web) | `endLimit` in `src/scripts/ffly-api.ts` (spec 006) |

`lookupShared` needs ffly API ≥ 1.5.0. On an older API the lookup answers 404 or 405, which the site treats as a miss:
a shared link then only pre-fills the form, so the site can ship before the API.

`endLimit` reads `tier_limits.max_ends` (1 when absent). While the API says 1, Back to stays a single field; at 2 it
becomes a chip list, with no site change needed.
