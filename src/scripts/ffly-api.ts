import { FFLY_API_BASE, WEB_SEARCH } from '../app';

// Wire shapes of ffly API contract 1.2.0 (1B-bots apps/ffly-api/contract/openapi.json), only the
// fields this page reads. Free routes are redacted server-side, so most route fields are optional.

export interface Place {
  code: string;
  name: string;
  top: boolean;
}

export interface Meta {
  places: Place[];
  currency: string;
  limits: { max_cities: number; max_ends: number; max_nights: number; max_window_days: number };
  priorities: Record<string, { label: string; hint: string }>;
  default_priority: string;
  tier_limits: { max_cities: number; searches_per_day: number | null };
  free_searches_left: number | null;
}

export interface SearchRequest {
  start: string;
  ends: string[];
  cities: string[];
  date_from: string;
  date_to: string;
  min_nights: number;
  max_nights: number;
  priority: string;
  max_stops_per_leg?: number;
  client_request_id: string;
}

export interface Route {
  locked: boolean;
  price: number;
  n_cities: number;
  places?: string[] | null;
  nights?: number[] | null;
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
}

export const ACTIVE: readonly SearchStatus[] = ['fetching', 'planning'];

export type SubmitOutcome =
  | { kind: 'created'; id: string }
  | { kind: 'quota' | 'city_limit' | 'invalid' | 'busy' | 'error' };

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
      return { kind: 'invalid' };
    case 503:
      return { kind: 'busy' };
    default:
      return { kind: 'error' };
  }
}
