import type { Route } from './ffly-api';
import type { RouteRow, Warn } from './results';
import { routePlaces } from './share-text';

export const ROUTE_SORTS = ['best', 'price', 'stops'] as const;
export type RouteSort = (typeof ROUTE_SORTS)[number];

export const ROUTE_HIDES = ['stops', 'late'] as const satisfies readonly Warn[];
export type RouteHide = (typeof ROUTE_HIDES)[number];

export interface RouteView {
  sort: RouteSort;
  hide: readonly RouteHide[];
}

export const DEFAULT_VIEW: RouteView = { sort: 'best', hide: [] };

type Viewable = Pick<RouteRow, 'kind' | 'price' | 'stops' | 'warnings'>;

// A route without legs has no known stops, so it sorts after every route that has.
const UNKNOWN = Number.MAX_SAFE_INTEGER;
const SORT_KEY: Partial<Record<RouteSort, (row: Viewable) => number>> = {
  price: (row) => row.price,
  stops: (row) => (row.kind === 'full' ? row.stops : UNKNOWN),
};

const isLocked = (row: Pick<RouteRow, 'kind'>) => row.kind === 'locked';

export const unlockedCount = (rows: readonly Pick<RouteRow, 'kind'>[]) => rows.filter((row) => !isLocked(row)).length;

// What a phone's counts claim: the routes the visitor can read. Only a result of nothing but locked rows counts those,
// as routes found; it offers no filter.
export function routeCount<T extends Viewable>(rows: readonly T[], view: RouteView): number {
  return unlockedCount(rows) ? unlockedCount(viewRoutes(rows, view)) : rows.length;
}

// A card leaves out the flight back to where the trip began, as the summary above it says that.
export function cardPlaces(route: Route): string[] {
  const places = routePlaces(route);
  return places.length > 1 && places[0] === places[places.length - 1] ? places.slice(0, -1) : places;
}

export function toggleHide(view: RouteView, hide: RouteHide): RouteView {
  return { ...view, hide: view.hide.includes(hide) ? view.hide.filter((other) => other !== hide) : [...view.hide, hide] };
}

// Best match is the API's order. Array.prototype.sort is stable, so ties keep it too. Locked rows are never sorted,
// filtered or moved up: what is behind them must not show through their position.
export function viewRoutes<T extends Viewable>(rows: readonly T[], view: RouteView): T[] {
  const open = rows.filter((row) => !isLocked(row) && !view.hide.some((warn) => row.warnings.includes(warn)));
  const key = SORT_KEY[view.sort];
  if (key) open.sort((a, b) => key(a) - key(b));
  return [...open, ...rows.filter(isLocked)];
}
