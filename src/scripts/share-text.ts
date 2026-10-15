import { fill } from '../i18n/text';
import type { Leg, Route } from './ffly-api';

// A route as the full itinerary text, ported from the app's RouteShareText (ios-ffly spec 016): the header, each
// flight with the nights in the city it lands in, when the prices were checked, and the link. Only what the API sent,
// never the leg's fare source.

export interface ShareFormat {
  name: (code: string) => string;
  money: (amount: number) => string;
  day: (iso: string) => string;
  date: (date: Date) => string;
  nights: (n: number) => string;
  header: string;
  checked: string;
}

const SEPARATOR = ' · ';
const ARROW = ' → ';

// A locked route has no days, times or carriers to share.
export const canShare = (route: Route) => !route.locked && (route.legs ?? []).length > 0;

// The contract leaves `places` optional; the legs name the same places in flying order.
export function routePlaces(route: Route): string[] {
  if (route.places?.length) return route.places;
  const legs = route.legs ?? [];
  return legs.length ? [legs[0].from_place, ...legs.map((leg) => leg.to_place)] : [];
}

// Each city stayed in with its nights, when the API sent both and they line up.
function stays(route: Route): Map<string, number> {
  const visited = routePlaces(route).slice(1, -1);
  const nights = route.nights ?? [];
  return new Map(nights.length === visited.length ? visited.map((city, i) => [city, nights[i]]) : []);
}

function legLine(leg: Leg, f: ShareFormat): string {
  const place = (code: string, airport?: string | null) => [f.name(code), airport].filter(Boolean).join(' ');
  return [
    leg.day ? f.day(leg.day) : '',
    [leg.dep, leg.arr].filter(Boolean).join('–'),
    place(leg.from_place, leg.origin) + ARROW + place(leg.to_place, leg.dest),
    leg.carrier ?? '',
    leg.price != null ? f.money(leg.price) : '',
  ]
    .filter(Boolean)
    .join(SEPARATOR);
}

// The oldest fare on the route is what "checked" can honestly claim; the search's own time without one.
export function checkedAt(route: Route, fallbackS: number): Date {
  const times = (route.legs ?? []).map((leg) => leg.checked_at).filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  return new Date((times.length ? Math.min(...times) : fallbackS) * 1000);
}

// The itinerary without its link: the system share sheet takes the link apart, a copy appends it (withLink).
export function shareText(route: Route, searchedS: number, f: ShareFormat): string {
  const lines = [fill(f.header, { route: routePlaces(route).map(f.name).join(ARROW), price: f.money(route.price) })];
  const nights = stays(route);
  for (const leg of route.legs ?? []) {
    lines.push(legLine(leg, f));
    const stay = nights.get(leg.to_place);
    if (stay !== undefined) lines.push(f.name(leg.to_place) + SEPARATOR + f.nights(stay));
  }
  lines.push(fill(f.checked, { date: f.date(checkedAt(route, searchedS)) }));
  return lines.join('\n');
}

export const withLink = (text: string, link: string) => `${text}\n${link}`;
