import type { RouteRow, Warn } from './results';

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

export const isLocked = (row: Pick<RouteRow, 'kind'>) => row.kind === 'locked';

export const shownRoutes = (rows: readonly Pick<RouteRow, 'kind'>[]) => rows.filter((row) => !isLocked(row)).length;

// Best match is the API's order. Array.prototype.sort is stable, so ties keep it too. Locked rows are never sorted,
// filtered or moved up: what is behind them must not show through their position.
export function viewRoutes<T extends Viewable>(rows: readonly T[], view: RouteView): T[] {
  const open = rows.filter((row) => !isLocked(row) && !view.hide.some((warn) => row.warnings.includes(warn)));
  const key = SORT_KEY[view.sort];
  if (key) open.sort((a, b) => key(a) - key(b));
  return [...open, ...rows.filter(isLocked)];
}
