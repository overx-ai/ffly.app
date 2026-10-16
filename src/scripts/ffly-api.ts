import { FFLY_API_BASE, FLIGHT_HOURS, WEB_SEARCH } from '../app';

// Wire shapes of ffly API contract 1.3.0 (1B-bots apps/ffly-api/contract/openapi.json, spec 533), plus the
// shared-search lookup of 1.5.0 (spec 535), the localized places of 1.7.0 and their country of 1.8.0, only the fields this page reads. The web channel gets routes 1-3 in
// full and a locked tail, so most fields are optional. 1.12.0 (spec 574, read only with CONTRACT_1_12) adds the caller's
// Authorization, leg offers, the Pro preview and the Trip kit; their sellers are never read, so no partner is named.
// Spec 015 sends the request's options: one-way trips (1.10.0) and travellers (1.11.0) today, the rest from 1.12.0.

export interface Place {
  code: string;
  name: string;
  top: boolean;
  airports?: string[] | null;
  names?: Record<string, string> | null;
  country?: string | null;
  local?: string | null;
}

export interface Meta {
  places?: Place[];
  places_version?: string | null;
  currency: string;
  limits: { max_cities: number; max_ends: number; max_nights: number; max_window_days: number };
  tier_limits: {
    max_cities: number;
    max_ends?: number;
    searches_per_day: number | null;
    searches_per_window?: number | null;
    window_hours?: number | null;
    app_only_fields?: string[];
  };
  free_searches_left: number | null;
  tier?: Tier;
  priorities?: Record<string, { label: string; hint?: string }>;
  default_priority?: string;
}

export type Tier = 'free' | 'pro';

// Spec 016: Pro on the web needs v2 (CONTRACT_1_12); such a caller sees none of Free's nudges.
export const proCaller = (meta: Pick<Meta, 'tier'> | undefined, v12: boolean) => v12 && meta?.tier === 'pro';

export const endLimit = (meta: Pick<Meta, 'limits' | 'tier_limits'>) => Math.min(meta.tier_limits.max_ends ?? 1, meta.limits.max_ends);

const positive = (n: unknown): n is number => typeof n === 'number' && n > 0;

// ffly API 1.13.0 (spec 016): the searches a caller gets per window. Before 1.13.0 there is none, and copy names no count.
export function searchWindow(limits: Meta['tier_limits']): { searches: number; hours: number } | undefined {
  const { searches_per_window: searches, window_hours: hours } = limits;
  return positive(searches) && positive(hours) ? { searches, hours } : undefined;
}

export interface Travellers {
  adults: number;
  children: number;
  infants: number;
}

export const ONE_ADULT: Travellers = { adults: 1, children: 0, infants: 0 };

// A flight the traveller can't book, named by a full leg's own fields. `source` is echoed back as received, never shown.
export interface ExcludedFlight {
  source: string;
  origin: string;
  dest: string;
  day: string;
  dep: string;
}

// In `city` every day from `date_from` through `date_to` (one day without it), and the night after the last one.
export interface Pin {
  city: string;
  date_from: string;
  date_to?: string;
}

export interface Schedule {
  short_from: string;
  short_to: string;
}

export const API_HOURS: Schedule = { short_from: FLIGHT_HOURS.from, short_to: FLIGHT_HOURS.to };

// The request beyond the trip. Each is sent only when the visitor set it and the API allows it (allowedFields).
export interface TripOptions {
  optional?: string[];
  excluded?: ExcludedFlight[];
  pinned?: Pin[];
  max_stops_per_leg?: number;
  max_stops_total?: number;
  schedule?: Schedule;
  airports?: Record<string, string[]>;
  priority?: string;
  travellers?: Travellers;
}

export type OptionField = keyof TripOptions;

export const OPTION_FIELDS = [
  'optional',
  'excluded',
  'pinned',
  'max_stops_per_leg',
  'max_stops_total',
  'schedule',
  'airports',
  'priority',
  'travellers',
] as const satisfies readonly OptionField[];

// 1.11 answers these 422 app_only on the web; 1.12.0 (1B-bots spec 574) lets the web send them.
export const V12_FIELDS: readonly OptionField[] = OPTION_FIELDS.filter((field) => field !== 'travellers');

export interface Trip {
  start: string;
  ends: string[];
  cities: string[];
  dateFrom: string;
  dateTo: string;
  minNights: number;
  maxNights: number;
  options?: TripOptions;
}

export interface SearchRequest extends TripOptions {
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
  source?: string | null;
  link?: string | null;
  dep?: string | null;
  arr?: string | null;
  checked_at?: number | null;
  flags?: string[] | null;
  offers?: Offer[] | null;
}

export type OfferKind = 'direct' | 'partner';

export interface Offer {
  kind: OfferKind;
  url: string;
}

export interface ProPreview {
  price: number;
  saving: number;
}

export const KIT_KINDS = ['hotel', 'esim', 'insurance', 'transfer'] as const;
export type KitKind = (typeof KIT_KINDS)[number];

export interface TripKitOffer {
  kind: string;
  url: string;
  city?: string | null;
  check_in?: string | null;
  check_out?: string | null;
}

export interface Route {
  locked: boolean;
  price: number;
  n_cities: number;
  places?: string[] | null;
  nights?: number[] | null;
  legs?: Leg[] | null;
  pro_preview?: ProPreview | null;
  trip_kit?: TripKitOffer[] | null;
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

// A field goes out only while /meta's tier_limits.app_only_fields leaves it out; 1.12.0's need CONTRACT_1_12 too. A
// /meta without the list (the bundled snapshot, an older API) allows none, and a field the API refused stays out.
export function allowedFields(meta: Pick<Meta, 'tier_limits'>, v12: boolean, refused: ReadonlySet<string> = new Set()): Set<OptionField> {
  const appOnly = meta.tier_limits.app_only_fields;
  if (!Array.isArray(appOnly)) return new Set();
  return new Set(OPTION_FIELDS.filter((field) => (v12 || !V12_FIELDS.includes(field)) && !appOnly.includes(field) && !refused.has(field)));
}

const sameTravellers = (a: Travellers, b: Travellers) => a.adults === b.adults && a.children === b.children && a.infants === b.infants;
const sameHours = (a: Schedule, b: Schedule) => a.short_from === b.short_from && a.short_to === b.short_to;

// An option left at the API's default is no option: it is never sent, so a default search is today's request.
export function isSet(options: TripOptions, field: OptionField): boolean {
  const value = options[field];
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (field === 'travellers') return !sameTravellers(value as Travellers, ONE_ADULT);
  if (field === 'schedule') return !sameHours(value as Schedule, API_HOURS);
  if (field === 'airports') return Object.keys(value).length > 0;
  return true;
}

// A request made earlier (a skipped flight's, a kept one, a retry) loses every option the API has refused since.
export function allowedOnly(request: SearchRequest, allowed: ReadonlySet<OptionField>): SearchRequest {
  const dropped = OPTION_FIELDS.filter((field) => field in request && !allowed.has(field));
  if (!dropped.length) return request;
  const kept = { ...request };
  for (const field of dropped) delete kept[field];
  return kept;
}

// A deep copy, so a later edit of the form cannot change a sent request.
export function optionsOf(options: TripOptions | undefined, allowed: ReadonlySet<OptionField>): TripOptions {
  const given = options ?? {};
  const sent = OPTION_FIELDS.filter((field) => allowed.has(field) && isSet(given, field));
  return JSON.parse(JSON.stringify(Object.fromEntries(sent.map((field) => [field, given[field]]))));
}

export const hasOptions = (request: TripOptions) => OPTION_FIELDS.some((field) => isSet(request, field));

// One request model for every trip type: the trip, then only the options the visitor set and the API allows.
export const buildRequest = (trip: Trip, clientRequestId: string, allowed: ReadonlySet<OptionField> = new Set()): SearchRequest => ({
  start: trip.start,
  ends: trip.ends.length ? [...trip.ends] : [trip.start],
  cities: [...trip.cities],
  date_from: trip.dateFrom,
  date_to: trip.dateTo,
  min_nights: trip.minNights,
  max_nights: trip.maxNights,
  ...optionsOf(trip.options, allowed),
  client_request_id: clientRequestId,
});

export const ACTIVE: readonly SearchStatus[] = ['fetching', 'planning'];

export type SubmitOutcome =
  | { kind: 'created'; id: string }
  | { kind: 'app_only'; field?: string }
  | { kind: 'quota' | 'city_limit' | 'invalid' | 'busy' | 'web_unavailable' | 'error' };

export class NotFound extends Error {}

// A timeout rejects like a network error, so callers show their existing network message.
// Safari before 16 has no AbortSignal.timeout; there the request simply runs without one.
export const timeout = () => AbortSignal.timeout?.(WEB_SEARCH.requestTimeoutMs);

// Who calls ffly-api (spec 014). Unset, as with CONTRACT_1_12 off, every request is anonymous and header-free, so its
// GETs stay simple CORS requests with no preflight.
export interface Caller {
  headers(): Promise<Record<string, string>>;
  rejected(retried: boolean): Promise<void>;
}

let caller: Caller | undefined;
export const setCaller = (next: Caller | undefined) => {
  caller = next;
};

// ffly-api answering 401 to a signed-in call: refresh once and retry; a second 401 signs out and the call goes on as
// Free. At most three attempts, never a loop.
async function send(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const auth = caller ? await caller.headers() : {};
  const res = await fetch(url, { ...init, headers: { ...init.headers, ...auth }, signal: timeout() });
  if (res.status !== 401 || !('Authorization' in auth) || !caller || attempt > 1) return res;
  await caller.rejected(attempt > 0);
  return send(url, init, attempt + 1);
}

async function getJson<T>(path: string, withAccount = true): Promise<T> {
  const url = `${FFLY_API_BASE}${path}`;
  const res = await (withAccount ? send(url) : fetch(url, { signal: timeout() }));
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// The site has its own place list (places-store.ts): 1.9.0 then answers /meta without one, an older API ignores the
// parameter and sends it anyway.
export const getMeta = () => getJson<Meta>('/meta?places=false');

export type PlacesAnswer = { kind: 'same' } | { kind: 'fresh'; version?: string; places: Place[] };

export const versionOf = (etag: string | null) => etag?.replace(/^W\//, '').replace(/^"|"$/g, '') || undefined;

// A conditional request: the browser then neither answers from nor fills its own store, so a 304 reaches us.
export async function getPlaces(version?: string): Promise<PlacesAnswer> {
  const res = await fetch(`${FFLY_API_BASE}/places`, {
    headers: version ? { 'If-None-Match': `"${version}"` } : {},
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
  const res = await send(`${FFLY_API_BASE}/searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: unknown; reason?: unknown; field?: unknown };
  switch (res.status) {
    case 202:
      return typeof body.id === 'string' ? { kind: 'created', id: body.id } : { kind: 'error' };
    case 402:
      return { kind: body.reason === 'city_limit' ? 'city_limit' : 'quota' };
    case 429:
      return { kind: 'quota' };
    case 422:
      if (body.reason !== 'app_only') return { kind: 'invalid' };
      return typeof body.field === 'string' ? { kind: 'app_only', field: body.field } : { kind: 'app_only' };
    case 503:
      return { kind: body.reason === 'web_unavailable' ? 'web_unavailable' : 'busy' };
    default:
      return { kind: 'error' };
  }
}

export type SharedOutcome = { kind: 'hit'; view: SearchView } | { kind: 'miss' };

// The lookup's parameters name the trip alone, and the API keys a search by its whole request: a link with any option
// set would open that trip's plain search, so it only pre-fills (1B-bots spec 574 R3 adds a key for those).
export const isCurrent = (request: SearchRequest, today: string) => request.date_from >= today;
export const canLookup = (request: SearchRequest, today: string) => isCurrent(request, today) && !hasOptions(request);

// Lists go comma-separated and readable (cities=MAD,AMS, pins=ROM:2026-11-05), as in the app's share link.
export const commaQuery = (pairs: [string, string][]) =>
  pairs.map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':')}`).join('&');

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
    const view = await getJson<SearchView>(`/searches/shared?${query}`, false);
    const usable = typeof view.id === 'string' && Array.isArray(view.routes) && (view.status === 'done' || ACTIVE.includes(view.status));
    return usable ? { kind: 'hit', view } : { kind: 'miss' };
  } catch {
    return { kind: 'miss' };
  }
}

export function searchedAt({ updated }: Pick<SearchView, 'updated'>): Date | undefined {
  return typeof updated === 'number' && Number.isFinite(updated) ? new Date(updated * 1000) : undefined;
}

// 1.12.0's Trip kit for a trip being searched: an eSIM, insurance and hotels for its cities and window.
export async function getTripKit(cities: string[], from: string, to: string): Promise<TripKitOffer[]> {
  const query = commaQuery([
    ['cities', cities.join(',')],
    ['from', from],
    ['to', to],
  ]);
  const body = await getJson<{ offers?: unknown }>(`/trip-kit?${query}`);
  return Array.isArray(body.offers) ? (body.offers as TripKitOffer[]) : [];
}
