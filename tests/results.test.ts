import { describe, expect, it } from 'vitest';
import type { Leg, Route, SearchView } from '../src/scripts/ffly-api';
import { routeRows, safeLink, warningsOf } from '../src/scripts/results';

const names: Record<string, string> = { WAW: 'Warsaw', MAD: 'Madrid', AMS: 'Amsterdam' };
const format = {
  name: (code: string) => names[code] ?? code,
  money: (n: number) => `€${n}`,
  day: (iso: string) => iso.slice(5),
};

const leg = (over: Partial<Leg>): Leg => ({
  from_place: 'WAW',
  to_place: 'MAD',
  origin: 'WAW',
  dest: 'MAD',
  stops: 0,
  day: '2026-11-01',
  dep: '10:00',
  arr: '14:00',
  price: 40,
  carrier: 'Ryanair',
  link: 'https://example.com/book?marker=1',
  ...over,
});

const full: Route = {
  locked: false,
  price: 120,
  n_cities: 2,
  places: ['WAW', 'MAD', 'AMS', 'WAW'],
  nights: [2, 3],
  legs: [
    leg({}),
    leg({ from_place: 'MAD', to_place: 'AMS', origin: 'MAD', dest: 'AMS', day: '2026-11-03', stops: 1 }),
    leg({ from_place: 'AMS', to_place: 'WAW', origin: 'AMS', dest: 'WAW', day: '2026-11-06', dep: '06:30', arr: '23:40' }),
  ],
};
const locked: Route = { locked: true, price: 150, n_cities: 3 };
const view = (routes: Route[], more = 0) => ({ routes, more_routes: more }) as Pick<SearchView, 'routes' | 'more_routes'>;

describe('warningsOf', () => {
  it('flags stops, departures before 07:00 and late arrivals once each', () => {
    expect(warningsOf(full.legs!)).toEqual(['stops', 'early', 'late']);
    expect(warningsOf([leg({})])).toEqual([]);
    expect(warningsOf([leg({ arr: '21:00', flags: ['after_midnight'] })])).toEqual(['late']);
    expect(warningsOf([leg({ dep: '07:00' })])).toEqual([]);
  });
});

describe('routeRows', () => {
  it('builds a full row with leg rows from routes that carry legs', () => {
    const [row] = routeRows(view([full]), format).rows;
    expect(row).toMatchObject({
      rank: 1,
      kind: 'full',
      route: 'Warsaw → Madrid → Amsterdam → Warsaw',
      dates: '11-01 – 11-06',
      nights: '2 · 3',
      flights: 3,
      warnings: ['stops', 'early', 'late'],
      total: '€120',
    });
    expect(row.legs[1]).toEqual({
      day: '11-03',
      time: '10:00–14:00',
      from: 'Madrid',
      fromCode: 'MAD',
      to: 'Amsterdam',
      toCode: 'AMS',
      carrier: 'Ryanair',
      stops: 1,
      price: '€40',
      link: 'https://example.com/book?marker=1',
    });
  });

  it('locks the tail, and counts more routes only beyond the locked rows shown', () => {
    const { rows, more } = routeRows(view([full, full, full, locked, locked], 5), format);
    expect(rows.map((r) => r.kind)).toEqual(['full', 'full', 'full', 'locked', 'locked']);
    expect(rows[3]).toMatchObject({ rank: 4, nCities: 3, total: '€150', legs: [] });
    expect(more).toBe(3);
    expect(routeRows(view([full, locked], 1), format).more).toBe(0);
  });

  it('shows a route with places but no legs without details', () => {
    const partial: Route = { locked: true, price: 99, n_cities: 2, places: ['WAW', 'MAD', 'WAW'], nights: [3] };
    const [row] = routeRows(view([partial]), format).rows;
    expect(row).toMatchObject({ kind: 'partial', route: 'Warsaw → Madrid → Warsaw', nights: '3', legs: [] });
  });
});

describe('safeLink', () => {
  it('passes http(s) links through as they are and refuses anything else', () => {
    expect(safeLink('https://example.com/a?marker=1&x=2')).toBe('https://example.com/a?marker=1&x=2');
    expect(safeLink('http://example.com/')).toBe('http://example.com/');
    expect(safeLink('javascript:alert(1)')).toBeUndefined();
    expect(safeLink('not a url')).toBeUndefined();
    expect(safeLink(null)).toBeUndefined();
  });
});
