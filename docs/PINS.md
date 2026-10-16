# Pins

Contracts this site codes against. Bump a row in the same change that adopts a new version.

| Dependency | Version | Source | Used by |
|---|---|---|---|
| ffly API contract | 1.3.0 | 1B-bots `docs/specs/533-ffly-channels-web-app.md` (`apps/ffly-api/contract/openapi.json`) | `src/scripts/ffly-api.ts` (spec 003) |
| ffly API shared-search lookup | 1.5.0 | 1B-bots `docs/specs/535` (`GET /searches/shared`; its time is `updated`, epoch seconds) | `lookupShared` in `src/scripts/ffly-api.ts` (spec 005) |
| ffly API localized places | 1.7.0 | ffly-api 1.7.0 (`Place.names`, `/meta` `places_version`, `GET /places` with ETag) | `getPlaces`, `places-store.ts`, `placeName` (spec 007) |
| ffly API worldwide places | 1.8.0 | 1B-bots `docs/specs/539` (3,493 places, nullable `Place.country`, ISO 3166-1 alpha-2) | `public/places.json`, `countryNamer` (spec 008) |
| ffly API meta without places | 1.9.0 | 1B-bots `docs/specs/540` (`GET /meta?places=false`: `places: []`, the rest unchanged) | `getMeta` in `src/scripts/ffly-api.ts` (spec 009) |
| ffly API web end cap | 1.5.0 | 1B-bots `docs/specs/535` T8 (`/meta` `tier_limits.max_ends` = 2 for web) | `endLimit` in `src/scripts/ffly-api.ts` (spec 006) |
| ffly API accounts, offers, Trip kit | 1.12.0 | 1B-bots `docs/specs/574` (`Authorization: Bearer`, `leg.offers[]`, `route.pro_preview`, `route.trip_kit[]`, `GET /trip-kit`, `/meta` `tier` and v2 `tier_limits`, CORS allowing `Authorization`) | `src/scripts/ffly-api.ts`, `results.ts` behind `CONTRACT_1_12`; fixtures `tests/fixtures/ffly-api-1.12/`, `tests/contract/ffly-api-1.12.test.ts` (spec 014) |
| ffly API search window | 1.13.0 | 1B-bots `apps/ffly-api/contract/openapi.json` at `2c1201318` (spec 575): `/meta` `tier_limits.searches_per_window` and `window_hours`, required and nullable (10 every 12 hours for the web and v2 Free, 100 every 24 for Pro, null for 1.0's app Free, which keeps `searches_lifetime`); `searches_per_day` the daily total; `free_searches_left` what is left in the current window | `searchWindow` in `src/scripts/ffly-api.ts`, `src/scripts/quota.ts`, the home FAQ through `src/data/web-meta.json`; `tests/fixtures/ffly-api-1.13/meta.schema.json` (the published `MetaResponse`, verbatim), `tests/contract/ffly-api-1.13.test.ts` (spec 016) |
| ffly API one-way trips | 1.10.0 | 1B-bots `docs/specs/568` (`cities: []` with `ends: [destination]`; ends in visited cities) | the trip type in `src/scripts/filters.ts` `tripLists`, `buildRequest` (spec 015) |
| ffly API travellers | 1.11.0 | 1B-bots `docs/specs/570` (`travellers` `{adults, children, infants}`: adults + children at most 9, an infant per adult; prices per adult, the party carried into booking links; not in the web's `app_only_fields`) | `buildRequest`, `allowedFields`, `REQUEST_LIMITS` (spec 015) |
| ffly API web search options | 1.12.0 | 1B-bots `docs/specs/574` (the web's `tier_limits.app_only_fields` empties: `optional`, `excluded`, `pinned`, `max_stops_per_leg`, `max_stops_total`, `schedule`, `airports`, `priority`; the request schema is 1.11.0's, pinned in `tests/fixtures/ffly-api-1.12/search-request.schema.json`) | `allowedFields` behind `CONTRACT_1_12`; `tests/contract/ffly-api-parity.test.ts` (spec 015) |
| ios-ffly visa rules | spec 029, 2026-10-11 (`c01642f`) | ios-ffly `Template/Core/Services/VisaRules.swift` and `Template/Resources/visa_requirements.json` (MIT Passport Index) | `src/scripts/visa.ts`, `public/visa.json`, `public/visa-LICENSE.txt`; re-port when the app's table changes (spec 015) |
| overx-auth web sign-in | 2026-10-15 | 1B-bots `docs/specs/573` (`POST /apple/token` `{identity_token}`, `/google/token` `{id_token}`, `/token` `{refresh_token}`, `/revoke`; answers `{access_token, refresh_token, expires_in, token_type}`; Services ID `ai.overx.ffly.web`) | `src/server/auth-session.ts`, `src/pages/api/auth/*` (spec 014) |

The site sends no `X-Platform` header: a request without one is the web channel (1B-bots `apps/ffly-api/routes/deps.py`
`channel_of`: the app channel needs `X-Platform: ios` plus a known subscriber id), so the GETs need no CORS preflight.

`lookupShared` needs ffly API ≥ 1.5.0. On an older API the lookup answers 404 or 405, which the site treats as a miss:
a shared link then only pre-fills the form, so the site can ship before the API.

1.7.0 deployed 2026-10-06 (1B-bots c0e5c4f41; `/places` is gzipped, weak `ETag` `W/"<version>"`). Against an older server `names`, `places_version` and `/places` are absent: every
name is the English one from `/meta`, nothing is stored, and the snapshot (`node scripts/places.mjs`) has no version.

1.8.0 deployed 2026-10-06 (`places_version` `e93bc417e214621a`): the snapshot is `public/places.json` (3,493 places) plus
the bundled `src/data/web-meta.json`. Regenerate both (`npm run places`) whenever `/meta.places_version` moves, so first
visits load the site's file instead of the API's 49-language `/places`. Against a pre-1.8.0 list `country` is absent and
suggestions show no country.

`getMeta` asks `/meta?places=false`. An API older than 1.9.0 ignores the parameter and sends the full place list, which
the site tolerates (`Meta.places` is optional and stands in only when nothing else has a list).

`endLimit` reads `tier_limits.max_ends` (1 when absent). While the API says 1, Back to stays a single field; at 2 it
becomes a chip list, with no site change needed.

1.12.0 is read only while `CONTRACT_1_12` (`src/app.ts`) is on. Off, a 1.12.0 answer renders as 1.11's (`leg.link`,
the app hint), and no request carries `Authorization`. On, a signed-out visitor still sends no header at all, so the GETs
stay simple requests with no preflight; only a signed-in request carries `Authorization: Bearer`, which preflights, and
1.12.0's CORS allows it from `https://ffly.app`. `GET /places` and `GET /searches/shared` never carry it. A 401 on a
signed-in call refreshes once through `/api/auth/token` and retries; a second 401 signs out and the call goes on as Free.
The site reads no `seller` from an offer or the Trip kit, so no partner is ever named on the page.

1.13.0's window is read whether or not `CONTRACT_1_12` is on (spec 016): the web limit is the API's, never the site's.
1.13.0 deployed 2026-10-16 (windows turn at 00:00 and 12:00 UTC). Without a window (an older API, or a null one) the quota
note still counts `free_searches_left`, but the spent line and the home FAQ name no number ("Try again later.", "You can
also try a search on the web, free."). The home FAQ is prerendered from `src/data/web-meta.json`, which `npm run places`
writes with the two fields; `check-legal` holds the FAQ to that file. The fixtures are the live web `/meta` of 2026-10-16
(`meta-web.json`) and a Pro answer, both validated against the published `MetaResponse`.

The browser never calls overx-auth (it has no CORS): `src/pages/api/auth/*` do, from this site's server, and keep only the
refresh token, in `ffly_session` (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`). They send no `device_id`, so a
refresh needs none; overx-auth's rotation grace covers two tabs refreshing at once.

Spec 015 sends an option only when the visitor set it **and** `/meta` `tier_limits.app_only_fields` leaves it out; the
1.12.0 fields also need `CONTRACT_1_12` (`allowedFields`). Live 1.11 lists all eight for the web, so today only
`travellers` and the trip type reach the API, and a default search is byte-identical to the request before spec 015. A
`/meta` without the list (the bundled snapshot, an older API) allows none. If a stale `/meta` lets a field through and the
API answers `422 app_only` with that `field`, the site drops it from every later request and keeps the form filled.

`GET /searches/shared` takes the trip alone (start, ends, cities, dates, nights), and the API keys a search by its whole
request (`request_hash`), travellers included. A shared link that carries any option therefore only pre-fills the form
(`canLookup`), never opens that trip's plain search. 1B-bots spec 574 R3 adds `GET /searches/shared?key=<share_key>`
for such links; adopting it is a later change. Skipped flights never go in a link: `ExcludedFlight.source` names a fare
source, which the site sends back as received and never shows.
