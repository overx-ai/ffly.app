import { PREFS, REQUEST_LIMITS, type Pref } from '../app';
import { addDays, daysBetween, type Nights } from './calendar';
import { ONE_ADULT, commaQuery, isSet, type Pin, type SearchRequest, type Travellers, type TripOptions } from './ffly-api';
import { TRAVELLER_KINDS, lastDay, makePin, minutesOf, stepTravellers, withoutPinned } from './filters';

export type Source = 'query' | 'cookie' | 'default';

export interface Filled<T> {
  value: T;
  source: Source;
}

export interface Dates {
  from: string;
  to: string;
}

export interface Prefs {
  from: Filled<string | undefined>;
  back: Filled<string[]>;
  cities: Filled<string[]>;
  dates: Filled<Dates | undefined>;
  nights: Filled<Nights | undefined>;
  options: TripOptions;
}

export interface Limits {
  maxNights: number;
  maxWindowDays: number;
}

// The app's share link opens the web search with ?from=&cities=&back= (place codes, lists comma-separated);
// a web search adds dates=YYYY-MM-DD..YYYY-MM-DD and nights=min-max, which are read from the query only, and each
// option the visitor set (spec 015): maybe=MAD, pins=ROM:2026-11-05..2026-11-06, stops=0, connections=2,
// hours=07:00-21:00, airports=LHR,LGW, priority=price, adults=2, children=1, infants=1. An empty cities= with a back
// is a one-way trip. Skipped flights belong to the trip they were skipped on and never go in a link.
const QUERY = {
  from: 'from',
  back: 'back',
  cities: 'cities',
  dates: 'dates',
  nights: 'nights',
  maybe: 'maybe',
  pins: 'pins',
  stops: 'stops',
  connections: 'connections',
  hours: 'hours',
  airports: 'airports',
  priority: 'priority',
} as const;
const DATES = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const NIGHTS = /^(\d{1,2})-(\d{1,2})$/;
const PIN = /^([A-Z0-9]{3}):(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/;
const HOURS = /^((?:[01]\d|2[0-3]):[0-5]\d)-((?:[01]\d|2[0-3]):[0-5]\d)$/;
const COUNT = /^\d{1,2}$/;
const PRIORITY = /^[a-z_]{1,32}$/;
const NO_LIMITS: Limits = { maxNights: Infinity, maxWindowDays: Infinity };
const DAY_S = 86_400;
const ATTRIBUTES = 'Path=/; SameSite=Lax; Secure';

export const cookieString = (pref: Pref, value: string) =>
  `${pref.cookie}=${encodeURIComponent(value)}; Max-Age=${pref.days * DAY_S}; ${ATTRIBUTES}`;

export const clearCookie = (pref: Pref) => `${pref.cookie}=; Max-Age=0; ${ATTRIBUTES}`;

export function parseCookies(header: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    try {
      cookies.set(part.slice(0, eq).trim(), decodeURIComponent(part.slice(eq + 1).trim()));
    } catch {
      continue;
    }
  }
  return cookies;
}

// No ends, or only the start, is a round trip: the link and the cookie leave "back" out.
export const finishOf = ({ start, ends }: { start: string; ends: string[] }): string[] =>
  ends.length === 1 && ends[0] === start ? [] : ends;

export function savedCookies(trip: { start: string; ends: string[]; cities: string[] }): string[] {
  const finish = finishOf(trip);
  return [
    cookieString(PREFS.from, trip.start),
    finish.length ? cookieString(PREFS.back, finish.join(',')) : clearCookie(PREFS.back),
    cookieString(PREFS.cities, trip.cities.join(',')),
  ];
}

const codesOf = (raw: string | null | undefined, isPlace: (code: string) => boolean) =>
  (raw ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code && isPlace(code));

function first<T>(candidates: [Source, T | undefined][], fallback: T): Filled<T> {
  for (const [source, value] of candidates) if (value !== undefined) return { value, source };
  return { value: fallback, source: 'default' };
}

type Read<T> = (raw: string | null | undefined) => T | undefined;

const isDay = (iso: string) => addDays(iso, 0) === iso;

function readDates(raw: string | null, limits: Limits): Dates | undefined {
  const [, from, to] = raw?.match(DATES) ?? [];
  if (!from || !to || !isDay(from) || !isDay(to)) return undefined;
  const span = daysBetween(from, to);
  return span > 0 && span <= limits.maxWindowDays ? { from, to } : undefined;
}

function readNights(raw: string | null, limits: Limits): Nights | undefined {
  const [, min, max] = raw?.match(NIGHTS) ?? [];
  const nights = { min: Number(min), max: Number(max) };
  return min && max && nights.min >= 1 && nights.min <= nights.max && nights.max <= limits.maxNights ? nights : undefined;
}

export const namesPlaces = (query: URLSearchParams, cookies: Map<string, string>) =>
  (['from', 'back', 'cities'] as const).some((key) => query.get(QUERY[key]) || cookies.get(PREFS[key].cookie));

const listOf = (raw: string | null) => (raw ?? '').split(',').map((item) => item.trim()).filter(Boolean);

function readPins(raw: string | null, cities: string[]): Pin[] | undefined {
  const pins: Pin[] = [];
  for (const item of listOf(raw)) {
    const [, city, from, to] = item.toUpperCase().match(PIN) ?? [];
    if (!city || !cities.includes(city) || !isDay(from) || (to && !(isDay(to) && to > from))) continue;
    if (!pins.some((pin) => pin.city === city)) pins.push(makePin(city, from, to));
  }
  return pins.length ? pins.slice(0, REQUEST_LIMITS.pins) : undefined;
}

function readCount(raw: string | null, max: number): number | undefined {
  const n = Number(raw);
  return raw && COUNT.test(raw) && n <= max ? n : undefined;
}

function readHours(raw: string | null) {
  const [, from, to] = raw?.match(HOURS) ?? [];
  return from && to && minutesOf(from) < minutesOf(to) ? { short_from: from, short_to: to } : undefined;
}

// A flat list of airport codes, each under the trip's city that has it.
function readAirports(raw: string | null, places: string[], airportsOf: (city: string) => readonly string[]) {
  const codes = listOf(raw).map((code) => code.toUpperCase());
  const chosen = Object.fromEntries(
    places
      .map((city) => [city, airportsOf(city).filter((code) => codes.includes(code))] as const)
      .filter(([city, picked]) => picked.length > 0 && picked.length < airportsOf(city).length),
  );
  return Object.keys(chosen).length ? chosen : undefined;
}

// A party the API would refuse is dropped whole, never clamped into another one.
function readTravellers(query: URLSearchParams): Travellers | undefined {
  if (!TRAVELLER_KINDS.some((kind) => query.has(kind))) return undefined;
  const party = { ...ONE_ADULT };
  for (const kind of TRAVELLER_KINDS) {
    const raw = query.get(kind);
    if (raw === null) continue;
    const n = readCount(raw, REQUEST_LIMITS.seated);
    if (n === undefined) return undefined;
    party[kind] = n;
  }
  const kept = TRAVELLER_KINDS.reduce((t, kind) => stepTravellers(t, kind, 0), party);
  return TRAVELLER_KINDS.every((kind) => kept[kind] === party[kind]) ? party : undefined;
}

function readOptions(query: URLSearchParams, start: string | undefined, ends: string[], cities: string[], airportsOf: (city: string) => readonly string[]): TripOptions {
  const maybe = listOf(query.get(QUERY.maybe)).map((code) => code.toUpperCase()).filter((code) => cities.includes(code));
  const pinned = readPins(query.get(QUERY.pins), cities);
  const priority = query.get(QUERY.priority) ?? '';
  const options: TripOptions = {
    optional: withoutPinned([...new Set(maybe)], pinned ?? []),
    pinned,
    max_stops_per_leg: readCount(query.get(QUERY.stops), REQUEST_LIMITS.stopsPerLeg),
    max_stops_total: readCount(query.get(QUERY.connections), REQUEST_LIMITS.stopsTotal),
    schedule: readHours(query.get(QUERY.hours)),
    airports: readAirports(query.get(QUERY.airports), [...(start ? [start] : []), ...ends, ...cities], airportsOf),
    priority: PRIORITY.test(priority) ? priority : undefined,
    travellers: readTravellers(query),
  };
  return Object.fromEntries(Object.entries(options).filter(([field]) => isSet(options, field as keyof TripOptions)));
}

export function fillPrefs(
  query: URLSearchParams,
  cookies: Map<string, string>,
  isPlace: (code: string) => boolean,
  limits: Limits = NO_LIMITS,
  airportsOf: (city: string) => readonly string[] = () => [],
): Prefs {
  const one: Read<string> = (raw) => codesOf(raw, isPlace)[0];
  const many: Read<string[]> = (raw) => {
    const codes = codesOf(raw, isPlace);
    return codes.length ? [...new Set(codes)] : undefined;
  };
  const fill = <T>(key: 'from' | 'back' | 'cities', read: Read<T>, fallback: T) =>
    first([['query', read(query.get(QUERY[key]))], ['cookie', read(cookies.get(PREFS[key].cookie))]], fallback);
  const from = fill<string | undefined>('from', one, undefined);
  const back = fill('back', many, []);
  const oneWay = query.get(QUERY.cities) === '' && back.source === 'query';
  const cities: Filled<string[]> = oneWay ? { value: [], source: 'query' } : fill('cities', many, []);
  return {
    from,
    back,
    cities,
    dates: first([['query', readDates(query.get(QUERY.dates), limits)]], undefined),
    nights: first([['query', readNights(query.get(QUERY.nights), limits)]], undefined),
    options: readOptions(query, from.value, back.value, cities.value, airportsOf),
  };
}

const pinText = (pin: Pin) => `${pin.city}:${pin.date_from}${pin.date_to ? `..${lastDay(pin)}` : ''}`;

function optionPairs(r: TripOptions): [string, string][] {
  const pairs: [string, string | undefined][] = [
    [QUERY.maybe, r.optional?.join(',')],
    [QUERY.pins, r.pinned?.map(pinText).join(',')],
    [QUERY.stops, r.max_stops_per_leg?.toString()],
    [QUERY.connections, r.max_stops_total?.toString()],
    [QUERY.hours, r.schedule && `${r.schedule.short_from}-${r.schedule.short_to}`],
    [QUERY.airports, r.airports && Object.values(r.airports).flat().join(',')],
    [QUERY.priority, r.priority],
    ...(isSet(r, 'travellers') ? TRAVELLER_KINDS.map((kind): [string, string] => [kind, String(r.travellers![kind])]) : []),
  ];
  return pairs.filter((pair): pair is [string, string] => Boolean(pair[1]));
}

export function shareQuery(r: SearchRequest): string {
  const finish = finishOf(r);
  return commaQuery([
    [QUERY.from, r.start],
    ...(finish.length ? [[QUERY.back, finish.join(',')] as [string, string]] : []),
    [QUERY.cities, r.cities.join(',')],
    [QUERY.dates, `${r.date_from}..${r.date_to}`],
    [QUERY.nights, `${r.min_nights}-${r.max_nights}`],
    ...optionPairs(r),
  ]);
}

export const shareUrl = (path: string, request: SearchRequest, hash = '') => `${path}?${shareQuery(request)}${hash}`;

export const sameSearch = (a: SearchRequest, b: SearchRequest) => shareQuery(a) === shareQuery(b);

// A link is a shared search only when it names the whole trip; a cookie never completes one.
export function sharedRequest(prefs: Prefs, clientRequestId: string): SearchRequest | undefined {
  const { from, back, cities, dates, nights, options } = prefs;
  if (from.source !== 'query' || cities.source !== 'query' || !from.value || !dates.value || !nights.value) return undefined;
  return {
    start: from.value,
    ends: back.source === 'query' && back.value.length ? back.value : [from.value],
    cities: cities.value,
    date_from: dates.value.from,
    date_to: dates.value.to,
    min_nights: nights.value.min,
    max_nights: nights.value.max,
    ...options,
    client_request_id: clientRequestId,
  };
}
