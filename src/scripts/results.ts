import { WEB_SEARCH } from '../app';
import { KIT_KINDS, type KitKind, type Leg, type OfferKind, type Route, type SearchView, type TripKitOffer } from './ffly-api';

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
  book: BookLink[];
  nights?: number;
}

export interface BookLink {
  kind: OfferKind | 'link';
  url: string;
}

export interface KitLink {
  text: string;
  url: string;
}

export interface KitGroup {
  kind: KitKind;
  links: KitLink[];
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
  proSaving?: number;
  kit: KitGroup[];
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

// The API's partner link is used as-is; anything but https is refused so a bad value cannot run script.
export function safeLink(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

// 1.12.0 offers in the API's order (direct, then partner); else the leg's one link, as on 1.11.
export function bookLinks(leg: Leg, v12: boolean): BookLink[] {
  const offers = v12 ? (leg.offers ?? []) : [];
  const fromOffers = offers.flatMap((offer): BookLink[] => {
    const url = safeLink(offer.url);
    return url && (offer.kind === 'direct' || offer.kind === 'partner') ? [{ kind: offer.kind, url }] : [];
  });
  // One Book per leg (founder, 2026-10-17): telling two apart would name where the fare comes from.
  if (fromOffers.length) return fromOffers.slice(0, 1);
  const link = safeLink(leg.link);
  return link ? [{ kind: 'link', url: link }] : [];
}

type KitFormat = Pick<Format, 'name' | 'day'>;

function kitLink(offer: TripKitOffer, f: KitFormat): KitLink[] {
  const url = safeLink(offer.url);
  if (!url) return [];
  const city = offer.city ? f.name(offer.city) : '';
  const dates = offer.check_in && offer.check_out ? `${f.day(offer.check_in)} – ${f.day(offer.check_out)}` : '';
  return [{ text: [city, dates].filter(Boolean).join(' · '), url }];
}

// The Trip kit in a fixed order of kinds; an unknown kind or a link that is not https is left out. A link reads as its
// city and dates; one with neither gets the caller's generic text.
export function kitGroups(offers: TripKitOffer[] | null | undefined, f: KitFormat): KitGroup[] {
  const all = offers ?? [];
  return KIT_KINDS.map((kind) => ({ kind, links: all.filter((offer) => offer.kind === kind).flatMap((offer) => kitLink(offer, f)) }))
    .filter((group) => group.links.length > 0);
}

// nights[i] is the stay at leg i's destination, so the flight back has none.
const legRow = (leg: Leg, f: Format, nights: number | undefined, v12: boolean): LegRow => ({
  day: leg.day ? f.day(leg.day) : '',
  time: [leg.dep, leg.arr].filter(Boolean).join('–'),
  from: f.name(leg.from_place),
  fromCode: leg.origin ?? leg.from_place,
  to: f.name(leg.to_place),
  toCode: leg.dest ?? leg.to_place,
  carrier: leg.carrier ?? '',
  stops: leg.stops,
  price: leg.price != null ? f.money(leg.price) : '',
  book: bookLinks(leg, v12),
  nights,
});

function kindOf(route: Route): RouteRow['kind'] {
  if (route.legs?.length) return 'full';
  if (route.places?.length) return 'partial';
  return 'locked';
}

function routeRow(route: Route, rank: number, f: Format, v12: boolean): RouteRow {
  const legs = route.legs ?? [];
  const days = legs.map((l) => l.day).filter((d): d is string => Boolean(d));
  return {
    rank,
    kind: kindOf(route),
    route: (route.places ?? []).map(f.name).join(' → '),
    dates: days.length ? `${f.day(days[0])} – ${f.day(days[days.length - 1])}` : '',
    nights: route.nights?.join(' · ') ?? '',
    flights: legs.length,
    warnings: warningsOf(legs),
    total: f.money(route.price),
    nCities: route.n_cities,
    legs: legs.map((l, i) => legRow(l, f, route.nights?.[i], v12)),
    proSaving: v12 && route.pro_preview && route.pro_preview.saving > 0 ? route.pro_preview.saving : undefined,
    kit: v12 ? kitGroups(route.trip_kit, f) : [],
  };
}

// The web gets routes 1-3 in full and a locked tail; `more` counts any routes beyond the locked rows shown. `v12` reads
// contract 1.12.0's offers, Pro preview and Trip kit (CONTRACT_1_12); without it a 1.12.0 answer renders as 1.11's.
export function routeRows(view: Pick<SearchView, 'routes' | 'more_routes'>, f: Format, v12 = false) {
  const rows = view.routes.map((route, i) => routeRow(route, i + 1, f, v12));
  const lockedShown = rows.filter((r) => r.kind === 'locked').length;
  return { rows, more: Math.max(0, (view.more_routes ?? 0) - lockedShown) };
}
