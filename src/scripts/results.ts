import { WEB_SEARCH } from '../app';
import type { Leg, Route, SearchView } from './ffly-api';

export type Warn = 'stops' | 'early' | 'late';

export interface Format {
  name: (code: string) => string;
  money: (amount: number) => string;
  day: (iso: string) => string;
}

export interface LegRow {
  day: string;
  time: string;
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  carrier: string;
  stops: number;
  price: string;
  link: string | undefined;
}

export interface RouteRow {
  rank: number;
  kind: 'full' | 'partial' | 'locked';
  route: string;
  dates: string;
  nights: string;
  flights: number;
  warnings: Warn[];
  total: string;
  nCities: number;
  legs: LegRow[];
}

const WARNS: Warn[] = ['stops', 'early', 'late'];
const LATE_FLAGS = ['late', 'after_midnight'];

export function warningsOf(legs: Leg[]): Warn[] {
  const found = new Set<Warn>();
  for (const leg of legs) {
    if (leg.stops > 0) found.add('stops');
    if (leg.dep && leg.dep < WEB_SEARCH.earlyBefore) found.add('early');
    if ((leg.arr && leg.arr >= WEB_SEARCH.lateFrom) || leg.flags?.some((f) => LATE_FLAGS.includes(f))) found.add('late');
  }
  return WARNS.filter((w) => found.has(w));
}

// The API's partner link is used as-is; anything but http(s) is refused so a bad value cannot run script.
export function safeLink(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}

const legRow = (leg: Leg, f: Format): LegRow => ({
  day: leg.day ? f.day(leg.day) : '',
  time: [leg.dep, leg.arr].filter(Boolean).join('–'),
  from: f.name(leg.from_place),
  fromCode: leg.origin ?? leg.from_place,
  to: f.name(leg.to_place),
  toCode: leg.dest ?? leg.to_place,
  carrier: leg.carrier ?? '',
  stops: leg.stops,
  price: leg.price != null ? f.money(leg.price) : '',
  link: safeLink(leg.link),
});

function routeRow(route: Route, rank: number, f: Format): RouteRow {
  const legs = route.legs ?? [];
  const days = legs.map((l) => l.day).filter((d): d is string => Boolean(d));
  return {
    rank,
    kind: legs.length ? 'full' : route.places?.length ? 'partial' : 'locked',
    route: (route.places ?? []).map(f.name).join(' → '),
    dates: days.length ? `${f.day(days[0])} – ${f.day(days[days.length - 1])}` : '',
    nights: route.nights?.join(' · ') ?? '',
    flights: legs.length,
    warnings: warningsOf(legs),
    total: f.money(route.price),
    nCities: route.n_cities,
    legs: legs.map((l) => legRow(l, f)),
  };
}

// The web gets routes 1-3 in full and a locked tail; `more` counts any routes beyond the locked rows shown.
export function routeRows(view: Pick<SearchView, 'routes' | 'more_routes'>, f: Format) {
  const rows = view.routes.map((route, i) => routeRow(route, i + 1, f));
  const lockedShown = rows.filter((r) => r.kind === 'locked').length;
  return { rows, more: Math.max(0, (view.more_routes ?? 0) - lockedShown) };
}
