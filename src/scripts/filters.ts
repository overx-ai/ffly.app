import { FLIGHT_HOURS, REQUEST_LIMITS } from '../app';
import { addDays, daysBetween } from './calendar';
import type { ExcludedFlight, Leg, Pin, SearchRequest, Travellers } from './ffly-api';

// The search options' rules (spec 015), ported from the app's SearchFormModel, TripFilters and Travellers so the form
// never sends what the API would answer with 422.

export type TripType = 'round' | 'oneway' | 'multi';
export const TRIP_TYPES: readonly TripType[] = ['round', 'oneway', 'multi'];

// Round trip is cities [To] and ends [From]; one-way is no city and ends [To] (API 1.10.0).
export function tripLists(type: Exclude<TripType, 'multi'>, start: string, destination: string) {
  return type === 'round' ? { ends: [start], cities: [destination] } : { ends: [destination], cities: [] };
}

// No city is one-way; one city there and back with nothing asked of it is a round trip; anything else multi-city.
export function tripTypeOf(r: Pick<SearchRequest, 'start' | 'ends' | 'cities' | 'optional' | 'pinned'>): TripType {
  if (!r.cities.length) return 'oneway';
  const back = r.ends.length === 1 && r.ends[0] === r.start;
  return r.cities.length === 1 && back && !r.optional?.length && !r.pinned?.length ? 'round' : 'multi';
}

export type TravellerKind = keyof Travellers;
export const TRAVELLER_KINDS: readonly TravellerKind[] = ['adults', 'children', 'infants'];

// Adults and children share the seats; an infant flies on an adult's lap.
export function travellerRange(t: Travellers, kind: TravellerKind): { min: number; max: number } {
  const { minAdults, seated } = REQUEST_LIMITS;
  if (kind === 'adults') return { min: minAdults, max: Math.max(minAdults, seated - t.children) };
  if (kind === 'children') return { min: 0, max: Math.max(0, seated - t.adults) };
  return { min: 0, max: t.adults };
}

// Fewer adults take the infants down with them.
export function stepTravellers(t: Travellers, kind: TravellerKind, delta: number): Travellers {
  const { min, max } = travellerRange(t, kind);
  const next = { ...t, [kind]: Math.min(max, Math.max(min, t[kind] + delta)) };
  return { ...next, infants: Math.min(next.infants, next.adults) };
}

// Any, then from the contract's maximum down to none, and back up to Any.
export function stepConnections(value: number | undefined, up: boolean): number | undefined {
  if (value === undefined) return up ? undefined : REQUEST_LIMITS.stopsTotal;
  if (up) return value < REQUEST_LIMITS.stopsTotal ? value + 1 : undefined;
  return Math.max(0, value - 1);
}

export type PinIssue =
  | { kind: 'tooMany' }
  | { kind: 'outsideWindow' | 'tooLong' | 'notACity'; city: string }
  | { kind: 'overlap'; city: string; other: string };

export const lastDay = (pin: Pin) => pin.date_to ?? pin.date_from;

// Every pinned day plus the night after the last one.
export const pinNights = (pin: Pin) => daysBetween(pin.date_from, lastDay(pin)) + 1;

// The API wants a pin strictly inside the window: a day to arrive before it, a day to leave after.
export const pinBounds = (dateFrom: string, dateTo: string) => ({ first: addDays(dateFrom, 1), last: addDays(dateTo, -1) });

export const makePin = (city: string, from: string, to?: string): Pin => (to && to !== from ? { city, date_from: from, date_to: to } : { city, date_from: from });

type PinRequest = Pick<SearchRequest, 'cities' | 'date_from' | 'date_to' | 'max_nights' | 'pinned'>;

// The API's pin validation (PlanRequest._merged_pins), in the order it checks; a pin per city, so none merge.
export function pinIssue(r: PinRequest): PinIssue | undefined {
  const pins = [...(r.pinned ?? [])].sort((a, b) => a.date_from.localeCompare(b.date_from));
  if (pins.length > REQUEST_LIMITS.pins) return { kind: 'tooMany' };
  for (const pin of pins) {
    if (!r.cities.includes(pin.city)) return { kind: 'notACity', city: pin.city };
    if (!(r.date_from < pin.date_from && lastDay(pin) < r.date_to)) return { kind: 'outsideWindow', city: pin.city };
    if (pinNights(pin) > r.max_nights) return { kind: 'tooLong', city: pin.city };
  }
  for (let i = 1; i < pins.length; i += 1) {
    if (lastDay(pins[i - 1]) >= pins[i].date_from) return { kind: 'overlap', city: pins[i - 1].city, other: pins[i].city };
  }
  return undefined;
}

// A pinned city must be visited, as the API makes it, so it is never a maybe.
export const withoutPinned = (optional: readonly string[], pinned: readonly Pin[]) => optional.filter((city) => !pinned.some((pin) => pin.city === city));

// All of a city's airports chosen is no choice at all; the last chosen one cannot be switched off.
export function toggleAirport(chosen: Record<string, string[]>, city: string, airport: string, all: readonly string[]) {
  const current = chosen[city] ?? [...all];
  const on = current.includes(airport);
  if (on && current.length === 1) return chosen;
  const next = all.filter((code) => (code === airport ? !on : current.includes(code)));
  const { [city]: _, ...rest } = chosen;
  return next.length === all.length ? rest : { ...rest, [city]: next };
}

export const airportsWithin = (chosen: Record<string, string[]>, places: readonly string[]) =>
  Object.fromEntries(Object.entries(chosen).filter(([city]) => places.includes(city)));

const CLOCK = /^\d{2}:\d{2}$/;

// A full leg names its flight; a locked or partial one has nothing to skip it by.
export function flightOf(leg: Leg): ExcludedFlight | undefined {
  const { source, origin, dest, day } = leg;
  if (!source || source.length > REQUEST_LIMITS.sourceLength || origin?.length !== 3 || dest?.length !== 3 || !day) return undefined;
  return { source, origin, dest, day, dep: leg.dep && CLOCK.test(leg.dep) ? leg.dep : '' };
}

// The API matches a skipped flight whichever source lists it.
export const sameFlight = (a: ExcludedFlight, b: ExcludedFlight) => a.origin === b.origin && a.dest === b.dest && a.day === b.day && a.dep === b.dep;

export const canSkip = (excluded: readonly ExcludedFlight[], flight: ExcludedFlight) =>
  excluded.length < REQUEST_LIMITS.excluded && !excluded.some((other) => sameFlight(other, flight));

const MINUTES_PER_DAY = 24 * 60;

export const minutesOf = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
export const clockOf = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const steps = (from: number, to: number) =>
  Array.from({ length: Math.max(0, Math.ceil((to - from) / FLIGHT_HOURS.stepMinutes)) }, (_, i) => clockOf(from + i * FLIGHT_HOURS.stepMinutes));

// Takeoffs before the latest landing, and landings after the earliest takeoff, in quarter hours.
export const takeoffChoices = (landing: string) => steps(0, minutesOf(landing));
export const landingChoices = (takeoff: string) => steps(minutesOf(takeoff) + FLIGHT_HOURS.stepMinutes, MINUTES_PER_DAY);
