# Pins

Contracts this site codes against. Bump a row in the same change that adopts a new version.

| Dependency | Version | Source | Used by |
|---|---|---|---|
| ffly API contract | 1.3.0 | 1B-bots `docs/specs/533-ffly-channels-web-app.md` (`apps/ffly-api/contract/openapi.json`) | `src/scripts/ffly-api.ts` (spec 003) |
| ffly API shared-search lookup | 1.5.0 | 1B-bots `docs/specs/535` (`GET /searches/shared`; its time is `updated`, epoch seconds) | `lookupShared` in `src/scripts/ffly-api.ts` (spec 005) |
| ffly API localized places | 1.7.0 | ffly-api 1.7.0 (`Place.names`, `/meta` `places_version`, `GET /places` with ETag) | `getPlaces`, `places-store.ts`, `placeName` (spec 007) |
| ffly API web end cap | 1.5.0 | 1B-bots `docs/specs/535` T8 (`/meta` `tier_limits.max_ends` = 2 for web) | `endLimit` in `src/scripts/ffly-api.ts` (spec 006) |

`lookupShared` needs ffly API ≥ 1.5.0. On an older API the lookup answers 404 or 405, which the site treats as a miss:
a shared link then only pre-fills the form, so the site can ship before the API.

1.7.0 deployed 2026-10-06 (1B-bots c0e5c4f41; `/places` is gzipped, weak `ETag` `W/"<version>"`). Against an older server `names`, `places_version` and `/places` are absent: every
name is the English one from `/meta`, nothing is stored, and the snapshot (`node scripts/places.mjs`) has no version.
Regenerate the snapshot after that deploy so first visits get the names too.

`endLimit` reads `tier_limits.max_ends` (1 when absent). While the API says 1, Back to stays a single field; at 2 it
becomes a chip list, with no site change needed.
