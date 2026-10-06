import { FFLY_API_BASE, WEB_SEARCH } from '../app';

// Wire shapes of ffly API contract 1.3.0 (1B-bots apps/ffly-api/contract/openapi.json, spec 533), plus the
// shared-search lookup of 1.5.0 (spec 535) and the localized places of 1.7.0, only the fields this page reads. The web channel gets routes 1-3 in
// full and a locked tail, so most fields are optional.

export interface Place {
  code: string;
  name: string;
  top: boolean;
  airports?: string[] | null;
  names?: Record<string, string> | null;
}

export interface Meta {
  places: Place[];
  places_version?: string | null;
  currency: string;
  limits: { max_cities: number; max_ends: number; max_nights: number; max_window_days: number };
  tier_limits: { max_cities: number; max_ends?: number; searches_per_day: number | null };
  free_searches_left: number | null;
}

export const endLimit = (meta: Pick<Meta, 'limits' | 'tier_limits'>) => Math.min(meta.tier_limits.max_ends ?? 1, meta.limits.max_ends);

export interface Trip {
  start: string;
  ends: string[];
  cities: string[];
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
}

export interface SearchRequest {
  start: string;
  ends: string[];
  cities: string[];
  date_from: string;
  date_to: string;
  min_nights: number;
  max_nights: number;
  client_request_id: string;
}

export interface Leg {
  from_place: string;
  to_place: string;
  stops: number;
  origin?: string | null;
  dest?: string | null;
  day?: string | null;
  price?: number | null;
  carrier?: string | null;
  link?: string | null;
  dep?: string | null;
  arr?: string | null;
  flags?: string[] | null;
}

export interface Route {
  locked: boolean;
  price: number;
  n_cities: number;
  places?: string[] | null;
  nights?: number[] | null;
  legs?: Leg[] | null;
}

export interface Insights {
  fares_compared?: number | null;
  days_searched?: number | null;
  saved_eur?: number | null;
  early_starts_avoided?: number | null;
  sleep_saved_h?: number | null;
  hotel_nights_saved?: number | null;
  daylight_gained_h?: number | null;
}

export type SearchStatus = 'fetching' | 'planning' | 'done' | 'failed';

export interface SearchView {
  id: string;
  status: SearchStatus;
  done: number;
  total: number;
  eta_s: number | null;
  routes: Route[];
  insights?: Insights | null;
  sources?: { source: string; status: 'ok' | 'partial' | 'unavailable' }[] | null;
  more_routes?: number;
  app_hint?: { price: number } | null;
  updated?: number | null;
}

// The web sends the trip only: priority, filters (stops, excluded, pinned) and schedule are app-only (422 app_only).
export const buildRequest = (trip: Trip, clientRequestId: string): SearchRequest => ({
  start: trip.start,
  ends: trip.ends.length ? [...trip.ends] : [trip.start],
  cities: [...trip.cities],
  date_from: trip.dateFrom,
  date_to: trip.dateTo,
  min_nights: trip.minNights,
  max_nights: trip.maxNights,
  client_request_id: clientRequestId,
});

export const ACTIVE: readonly SearchStatus[] = ['fetching', 'planning'];

export type SubmitOutcome =
  | { kind: 'created'; id: string }
  | { kind: 'quota' | 'city_limit' | 'invalid' | 'app_only' | 'busy' | 'web_unavailable' | 'error' };

export class NotFound extends Error {}

const headers = { 'X-Platform': WEB_SEARCH.platform };

// A timeout rejects like a network error, so callers show their existing network message.
// Safari before 16 has no AbortSignal.timeout; there the request simply runs without one.
const timeout = () => AbortSignal.timeout?.(WEB_SEARCH.requestTimeoutMs);

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${FFLY_API_BASE}${path}`, { headers, signal: timeout() });
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getMeta = () => getJson<Meta>('/meta');

export type PlacesAnswer = { kind: 'same' } | { kind: 'fresh'; version?: string; places: Place[] };

export const versionOf = (etag: string | null) => etag?.replace(/^W\//, '').replace(/^"|"$/g, '') || undefined;

// A conditional request: the browser then neither answers from nor fills its own store, so a 304 reaches us.
export async function getPlaces(version?: string): Promise<PlacesAnswer> {
  const res = await fetch(`${FFLY_API_BASE}/places`, {
    headers: version ? { ...headers, 'If-None-Match': `"${version}"` } : headers,
    signal: timeout(),
  });
  if (res.status === 304) return { kind: 'same' };
  if (!res.ok) throw new Error(`GET /places: ${res.status}`);
  const body = (await res.json()) as { places?: unknown };
  if (!Array.isArray(body.places)) throw new Error('GET /places: no places');
  return { kind: 'fresh', version: versionOf(res.headers.get('ETag')), places: body.places as Place[] };
}

export const getSearch = (id: string) => getJson<SearchView>(`/searches/${encodeURIComponent(id)}`);

export async function createSearch(request: SearchRequest): Promise<SubmitOutcome> {
  const res = await fetch(`${FFLY_API_BASE}/searches`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: timeout(),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: unknown; reason?: unknown };
  switch (res.status) {
    case 202:
      return typeof body.id === 'string' ? { kind: 'created', id: body.id } : { kind: 'error' };
    case 402:
      return { kind: body.reason === 'city_limit' ? 'city_limit' : 'quota' };
    case 429:
      return { kind: 'quota' };
    case 422:
      return { kind: body.reason === 'app_only' ? 'app_only' : 'invalid' };
    case 503:
      return { kind: body.reason === 'web_unavailable' ? 'web_unavailable' : 'busy' };
    default:
      return { kind: 'error' };
  }
}

export type SharedOutcome = { kind: 'hit'; view: SearchView } | { kind: 'miss' };

export const canLookup = (request: SearchRequest, today: string) => request.date_from >= today;

// Lists go comma-separated and readable (cities=MAD,AMS), as in the app's share link and the shared lookup.
export const commaQuery = (pairs: [string, string][]) =>
  pairs.map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ',')}`).join('&');

// A stored web search, free of quota: a finished result, or an identical search still running (poll it by id).
// Anything else (an older API's 404 or 405, a 422, a CORS or network failure) is a miss: the caller only pre-fills.
export async function lookupShared(request: SearchRequest): Promise<SharedOutcome> {
  const query = commaQuery([
    ['start', request.start],
    ['ends', request.ends.join(',')],
    ['cities', request.cities.join(',')],
    ['date_from', request.date_from],
    ['date_to', request.date_to],
    ['min_nights', String(request.min_nights)],
    ['max_nights', String(request.max_nights)],
  ]);
  try {
    const view = await getJson<SearchView>(`/searches/shared?${query}`);
    const usable = typeof view.id === 'string' && Array.isArray(view.routes) && (view.status === 'done' || ACTIVE.includes(view.status));
    return usable ? { kind: 'hit', view } : { kind: 'miss' };
  } catch {
    return { kind: 'miss' };
  }
}

export function searchedAt({ updated }: Pick<SearchView, 'updated'>): Date | undefined {
  return typeof updated === 'number' && Number.isFinite(updated) ? new Date(updated * 1000) : undefined;
}
