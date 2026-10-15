import { LIBRARY } from '../app';
import type { Route, SearchRequest, SearchView } from './ffly-api';
import { shareQuery } from './prefs';

// Saved routes, history, passports and ratings (spec 015), kept in this browser only. Each entry holds the whole route
// or result, never just a search id: a web result expires at the trip's first day, a saved route outlives it.

export interface SavedRoute {
  key: string;
  route: Route;
  request: SearchRequest;
  currency: string;
  searched: number;
  saved: number;
}

export type Finished = Pick<SearchView, 'id' | 'routes' | 'more_routes' | 'insights' | 'sources' | 'updated'>;

export interface HistoryEntry {
  key: string;
  request: SearchRequest;
  view: Finished;
  currency: string;
  searched: number;
}

export interface Rating {
  id: string;
  stars: number;
}

export type StoreLike = Pick<Storage, 'getItem' | 'setItem'>;

// One saved entry per distinct route: the same flights on the same days are the same route.
export function routeKey(route: Route): string {
  const legs = route.legs ?? [];
  if (!legs.length) return JSON.stringify([route.places ?? [], route.nights ?? []]);
  return JSON.stringify(legs.map((leg) => [leg.origin ?? leg.from_place, leg.dest ?? leg.to_place, leg.day ?? '', leg.dep ?? '']));
}

// One history entry per distinct search, newest first.
export const searchKey = (request: SearchRequest) => shareQuery(request);

export const newestFirst = <T extends { key: string }>(list: readonly T[], entry: T, max: number): T[] =>
  [entry, ...list.filter((other) => other.key !== entry.key)].slice(0, max);

export const without = <T extends { key: string }>(list: readonly T[], key: string): T[] => list.filter((entry) => entry.key !== key);

// Compare takes two or three saved routes; a fourth pick is refused, never swapped in.
export function toggleCompare(selected: readonly string[], key: string): string[] {
  if (selected.includes(key)) return selected.filter((other) => other !== key);
  return selected.length < LIBRARY.compareMax ? [...selected, key] : [...selected];
}

export const canCompare = (selected: readonly string[]) => selected.length >= LIBRARY.compareMin && selected.length <= LIBRARY.compareMax;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;

const isList = (value: unknown): value is unknown[] => Array.isArray(value);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextList = (value: unknown) => isList(value) && value.every(isText);
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
// What the sheet formats (dates, money, times, names) must read, or one entry kept by an older page would break it whole.
const isRequest = (value: unknown): value is SearchRequest =>
  isObject(value) &&
  isText(value.start) &&
  isTextList(value.ends) &&
  isTextList(value.cities) &&
  isText(value.date_from) &&
  DAY.test(value.date_from) &&
  isText(value.date_to) &&
  DAY.test(value.date_to) &&
  Number.isInteger(value.min_nights) &&
  Number.isInteger(value.max_nights);
const isRoute = (value: unknown): value is Route =>
  isObject(value) && isNumber(value.price) && (value.legs == null || isList(value.legs)) && (value.places == null || isTextList(value.places));
const isKept = (value: unknown): value is Record<string, unknown> =>
  isObject(value) && isText(value.key) && isRequest(value.request) && isText(value.currency) && CURRENCY.test(value.currency) && isNumber(value.searched);
const isSavedRoute = (value: unknown): value is SavedRoute => isKept(value) && isRoute(value.route);
const isHistoryEntry = (value: unknown): value is HistoryEntry =>
  isKept(value) && isObject(value.view) && isList(value.view.routes) && value.view.routes.every(isRoute);
const isRating = (value: unknown): value is Rating => isObject(value) && isText(value.id) && Number.isInteger(value.stars);
const isCode = (value: unknown): value is string => isText(value) && /^[A-Z]{2}$/.test(value);

// Every read and write is guarded: storage may be disabled (private mode, blocked site data) or full. A write that does
// not fit says so; history alone makes room by dropping its oldest searches.
export class Library {
  constructor(private readonly store: StoreLike | undefined) {}

  private read<T>(key: string, valid: (value: unknown) => value is T): T[] {
    try {
      const value: unknown = JSON.parse(this.store?.getItem(key) ?? '[]');
      return isList(value) ? value.filter(valid) : [];
    } catch {
      return [];
    }
  }

  private write(key: string, list: unknown[]): boolean {
    if (!this.store) return false;
    try {
      this.store.setItem(key, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  }

  saved = () => this.read(LIBRARY.savedKey, isSavedRoute);
  isSaved = (key: string) => this.saved().some((entry) => entry.key === key);
  save = (entry: SavedRoute) => this.write(LIBRARY.savedKey, newestFirst(this.saved(), entry, LIBRARY.maxSaved));
  unsave = (key: string) => this.write(LIBRARY.savedKey, without(this.saved(), key));

  history = () => this.read(LIBRARY.historyKey, isHistoryEntry);
  forget = (key: string) => this.write(LIBRARY.historyKey, without(this.history(), key));

  record(entry: HistoryEntry): boolean {
    let list = newestFirst(this.history(), entry, LIBRARY.maxHistory);
    while (list.length) {
      if (this.write(LIBRARY.historyKey, list)) return true;
      list = list.slice(0, -1);
    }
    return false;
  }

  passports = () => this.read(LIBRARY.passportsKey, isCode).sort();
  setPassports = (codes: readonly string[]) => this.write(LIBRARY.passportsKey, [...new Set(codes)].sort());

  private ratings = () => this.read(LIBRARY.ratingsKey, isRating);
  rating = (id: string) => this.ratings().find((entry) => entry.id === id)?.stars;
  rate = (id: string, stars: number) =>
    this.write(LIBRARY.ratingsKey, [{ id, stars }, ...this.ratings().filter((entry) => entry.id !== id)].slice(0, LIBRARY.maxRatings));
}
