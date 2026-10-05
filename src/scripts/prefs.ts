import { PREFS, type Pref } from '../app';
import { addDays, daysBetween, type Nights } from './calendar';
import { commaQuery, type SearchRequest } from './ffly-api';

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
}

export interface Limits {
  maxNights: number;
  maxWindowDays: number;
}

// The app's share link opens the web search with ?from=&cities=&back= (place codes, lists comma-separated);
// a web search adds dates=YYYY-MM-DD..YYYY-MM-DD and nights=min-max, which are read from the query only.
const QUERY = { from: 'from', back: 'back', cities: 'cities', dates: 'dates', nights: 'nights' } as const;
const DATES = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const NIGHTS = /^(\d{1,2})-(\d{1,2})$/;
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

export function fillPrefs(
  query: URLSearchParams,
  cookies: Map<string, string>,
  isPlace: (code: string) => boolean,
  limits: Limits = NO_LIMITS,
): Prefs {
  const one: Read<string> = (raw) => codesOf(raw, isPlace)[0];
  const many: Read<string[]> = (raw) => {
    const codes = codesOf(raw, isPlace);
    return codes.length ? [...new Set(codes)] : undefined;
  };
  const fill = <T>(key: 'from' | 'back' | 'cities', read: Read<T>, fallback: T) =>
    first([['query', read(query.get(QUERY[key]))], ['cookie', read(cookies.get(PREFS[key].cookie))]], fallback);
  return {
    from: fill<string | undefined>('from', one, undefined),
    back: fill('back', many, []),
    cities: fill('cities', many, []),
    dates: first([['query', readDates(query.get(QUERY.dates), limits)]], undefined),
    nights: first([['query', readNights(query.get(QUERY.nights), limits)]], undefined),
  };
}

export function shareQuery(r: SearchRequest): string {
  const finish = finishOf(r);
  return commaQuery([
    [QUERY.from, r.start],
    ...(finish.length ? [[QUERY.back, finish.join(',')] as [string, string]] : []),
    [QUERY.cities, r.cities.join(',')],
    [QUERY.dates, `${r.date_from}..${r.date_to}`],
    [QUERY.nights, `${r.min_nights}-${r.max_nights}`],
  ]);
}

export const shareUrl = (path: string, request: SearchRequest, hash = '') => `${path}?${shareQuery(request)}${hash}`;

export const sameSearch = (a: SearchRequest, b: SearchRequest) => shareQuery(a) === shareQuery(b);

// A link is a shared search only when it names the whole trip; a cookie never completes one.
export function sharedRequest(prefs: Prefs, clientRequestId: string): SearchRequest | undefined {
  const { from, back, cities, dates, nights } = prefs;
  if (from.source !== 'query' || cities.source !== 'query' || !from.value || !dates.value || !nights.value) return undefined;
  return {
    start: from.value,
    ends: back.source === 'query' && back.value.length ? back.value : [from.value],
    cities: cities.value,
    date_from: dates.value.from,
    date_to: dates.value.to,
    min_nights: nights.value.min,
    max_nights: nights.value.max,
    client_request_id: clientRequestId,
  };
}
