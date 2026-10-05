import { PREFS, type Pref } from '../app';

export type Source = 'query' | 'cookie' | 'default';

export interface Filled<T> {
  value: T;
  source: Source;
}

export interface Prefs {
  from: Filled<string | undefined>;
  back: Filled<string | undefined>;
  cities: Filled<string[]>;
}

// The app's share link opens the web search with ?from=&cities=&back= (place codes, cities comma-separated).
const QUERY = { from: 'from', back: 'back', cities: 'cities' } as const;
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

export function savedCookies(trip: { start: string; end: string; cities: string[] }): string[] {
  return [
    cookieString(PREFS.from, trip.start),
    trip.end === trip.start ? clearCookie(PREFS.back) : cookieString(PREFS.back, trip.end),
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

export function fillPrefs(query: URLSearchParams, cookies: Map<string, string>, isPlace: (code: string) => boolean): Prefs {
  const one: Read<string> = (raw) => codesOf(raw, isPlace)[0];
  const many: Read<string[]> = (raw) => {
    const codes = codesOf(raw, isPlace);
    return codes.length ? [...new Set(codes)] : undefined;
  };
  const fill = <T>(key: keyof typeof QUERY, read: Read<T>, fallback: T) =>
    first([['query', read(query.get(QUERY[key]))], ['cookie', read(cookies.get(PREFS[key].cookie))]], fallback);
  return {
    from: fill<string | undefined>('from', one, undefined),
    back: fill<string | undefined>('back', one, undefined),
    cities: fill('cities', many, []),
  };
}
