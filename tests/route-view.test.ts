import { describe, expect, it } from 'vitest';
import type { RouteRow, Warn } from '../src/scripts/results';
import type { Route } from '../src/scripts/ffly-api';
import { DEFAULT_VIEW, cardPlaces, routeCount, unlockedCount, viewRoutes } from '../src/scripts/route-view';

const row = (rank: number, price: number, stops = 0, warnings: Warn[] = [], kind: RouteRow['kind'] = 'full') => ({ rank, price, stops, warnings, kind });
const locked = (rank: number, price: number) => row(rank, price, 0, [], 'locked');
const ranks = (rows: { rank: number }[]) => rows.map((r) => r.rank);

const rows = [row(1, 200, 1, ['stops']), row(2, 100, 0, ['late']), row(3, 150, 0), row(4, 100, 2, ['stops', 'late']), locked(5, 90), locked(6, 80)];

describe('viewRoutes', () => {
  it('keeps the API order for best match', () => {
    expect(viewRoutes(rows, DEFAULT_VIEW)).toEqual(rows);
  });

  it('sorts by total and by stops, ties in the API order', () => {
    expect(ranks(viewRoutes(rows, { sort: 'price', hide: [] }))).toEqual([2, 4, 3, 1, 5, 6]);
    expect(ranks(viewRoutes(rows, { sort: 'stops', hide: [] }))).toEqual([2, 3, 1, 4, 5, 6]);
  });

  it('hides routes with stops and late arrivals, together too', () => {
    expect(ranks(viewRoutes(rows, { sort: 'best', hide: ['stops'] }))).toEqual([2, 3, 5, 6]);
    expect(ranks(viewRoutes(rows, { sort: 'best', hide: ['late'] }))).toEqual([1, 3, 5, 6]);
    expect(ranks(viewRoutes(rows, { sort: 'best', hide: ['stops', 'late'] }))).toEqual([3, 5, 6]);
  });

  it('keeps locked rows last and in order, whatever their price', () => {
    const mixed = [locked(1, 10), row(2, 300), locked(3, 5), row(4, 200)];
    expect(ranks(viewRoutes(mixed, { sort: 'price', hide: [] }))).toEqual([4, 2, 1, 3]);
    expect(ranks(viewRoutes(mixed, { sort: 'best', hide: ['stops', 'late'] }))).toEqual([2, 4, 1, 3]);
  });

  it('leaves only the locked rows when every route is filtered out', () => {
    const view = viewRoutes([row(1, 100, 1, ['stops']), locked(2, 90)], { sort: 'price', hide: ['stops'] });
    expect(ranks(view)).toEqual([2]);
    expect(unlockedCount(view)).toBe(0);
  });

  it('sorts a route without legs after those with known stops', () => {
    const partial = [row(1, 100, 0, [], 'partial'), row(2, 200, 3, ['stops'])];
    expect(ranks(viewRoutes(partial, { sort: 'stops', hide: [] }))).toEqual([2, 1]);
  });

  it('counts only the routes that can be read, unless locked rows are all there is', () => {
    expect(routeCount(rows, DEFAULT_VIEW)).toBe(4);
    expect(routeCount(rows, { sort: 'best', hide: ['stops', 'late'] })).toBe(1);
    expect(routeCount([row(1, 100, 1, ['stops']), locked(2, 90)], { sort: 'best', hide: ['stops'] })).toBe(0);
    expect(routeCount([locked(1, 90), locked(2, 80)], DEFAULT_VIEW)).toBe(2);
  });

  it('does not change the rows it is given', () => {
    const before = [...rows];
    viewRoutes(rows, { sort: 'price', hide: ['late'] });
    expect(rows).toEqual(before);
  });
});

describe('cardPlaces', () => {
  const route = (fields: Partial<Route>) => fields as Route;

  it('drops the return to the start, and keeps a trip that ends elsewhere', () => {
    expect(cardPlaces(route({ places: ['WAW', 'ROM', 'WAW'] }))).toEqual(['WAW', 'ROM']);
    expect(cardPlaces(route({ places: ['WAW', 'ROM'] }))).toEqual(['WAW', 'ROM']);
  });

  it('reads the legs when places is missing, and keeps a single place', () => {
    const legs = [{ from_place: 'WAW', to_place: 'ROM' }, { from_place: 'ROM', to_place: 'WAW' }] as Route['legs'];
    expect(cardPlaces(route({ legs }))).toEqual(['WAW', 'ROM']);
    expect(cardPlaces(route({ places: ['WAW'] }))).toEqual(['WAW']);
  });
});
