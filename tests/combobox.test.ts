import { describe, expect, it } from 'vitest';
import STATIC from '../public/places.json';
import { WEB_SEARCH } from '../src/app';
import type { Place } from '../src/scripts/ffly-api';
import { comboKey, matchPlaces } from '../src/scripts/combobox';

const places = [
  { code: 'WMI', name: 'Warsaw Modlin', top: false },
  { code: 'LON', name: 'London', top: true, airports: ['STN', 'LTN', 'LGW'] },
  { code: 'STN', name: 'London Stansted', top: false },
  { code: 'WAW', name: 'Warsaw', top: true, airports: ['WAW'] },
  { code: 'LIS', name: 'Lisbon', top: true, airports: ['LIS'] },
  { code: 'LUX', name: 'Luxembourg', top: false },
];

const codes = (query: string, exclude: string[] = [], limit = 10, lang = 'en-GB') =>
  matchPlaces(places, query, { exclude: new Set(exclude), limit, lang }).map((p) => p.code);

describe('matchPlaces', () => {
  it('matches the prefix of a name or a code, ignoring case', () => {
    expect(codes('war')).toEqual(['WAW', 'WMI']);
    expect(codes('wmi')).toEqual(['WMI']);
  });

  it('puts top places first', () => {
    expect(codes('l')).toEqual(['LON', 'LIS', 'LUX']);
  });

  it('folds the airports of a multi-airport city into its row', () => {
    expect(codes('lon')).toEqual(['LON']);
    expect(codes('stn')).toEqual(['LON']);
  });

  it('drops excluded codes and honours the limit', () => {
    expect(codes('l', ['LON'])).toEqual(['LIS', 'LUX']);
    expect(codes('l', [], 2)).toEqual(['LON', 'LIS']);
  });

  it('offers the top places for an empty query', () => {
    expect(codes('  ')).toEqual(['LON', 'WAW', 'LIS']);
  });

  it('finds a name containing the query once it is three letters long', () => {
    expect(codes('saw')).toEqual(['WAW', 'WMI']);
    expect(codes('sa')).toEqual([]);
  });
});

describe('matchPlaces in the page language', () => {
  const cities = [
    { code: 'WAR', name: 'Warsaw', top: true, airports: ['WAW', 'WMI'], names: { de: 'Warschau', pl: 'Warszawa', fr: 'Varsovie' } },
    { code: 'WAW', name: 'Warsaw', top: false },
    { code: 'WMI', name: 'Warsaw (Modlin)', top: false },
    { code: 'KRK', name: 'Krakow', top: true, airports: ['KRK'], names: { pl: 'Kraków', de: 'Krakau' } },
    { code: 'LCJ', name: 'Lodz', top: false, airports: ['LCJ'], names: { pl: 'Łódź' } },
    { code: 'NAP', name: 'Naples', top: true, airports: ['NAP'], names: { it: 'Napoli' } },
    { code: 'SDR', name: 'Santander', top: false, airports: ['SDR'] },
    { code: 'MAD', name: 'Madrid', top: true, airports: ['MAD'] },
    { code: 'SVQ', name: 'Seville', top: false, airports: ['SVQ'], names: { es: 'Sevilla' } },
    { code: 'TAN', name: 'San Andres', top: false },
  ];
  const find = (query: string, lang: string) =>
    matchPlaces(cities, query, { exclude: new Set(), limit: 8, lang }).map((p) => p.code);

  it('matches the localized name, folding case and diacritics', () => {
    expect(find('warsch', 'de')).toEqual(['WAR']);
    expect(find('krakow', 'pl')).toEqual(['KRK']);
    expect(find('KRAKÓW', 'en-GB')).toEqual(['KRK']);
    expect(find('lodz', 'pl')).toEqual(['LCJ']);
  });

  it('always matches the English name too', () => {
    expect(find('warsaw', 'de')).toEqual(['WAR']);
    expect(find('naples', 'it')).toEqual(['NAP']);
  });

  it('finds a city by any of its airport codes', () => {
    expect(find('WMI', 'en-GB')).toEqual(['WAR']);
    expect(find('waw', 'pl')).toEqual(['WAR']);
  });

  it('ranks an exact code over a name prefix, a prefix over a word start, a word start over contains', () => {
    expect(find('mad', 'en-GB')).toEqual(['MAD']);
    expect(find('san', 'en-GB')).toEqual(['SDR', 'TAN']);
    expect(find('andres', 'en-GB')).toEqual(['TAN']);
    expect(find('and', 'en-GB')).toEqual(['TAN', 'SDR']);
  });

  it('puts an exact code ahead of a place whose name starts with it', () => {
    const list = [
      { code: 'BAR', name: 'Barcelona Area', top: true },
      { code: 'BCN', name: 'Barcelona', top: true, airports: ['BCN'] },
      { code: 'ARN', name: 'Stockholm', top: false, airports: ['ARN', 'BMA'] },
      { code: 'ARC', name: 'Arcachon', top: true },
    ];
    expect(matchPlaces(list, 'arn', { exclude: new Set(), limit: 8, lang: 'en-GB' }).map((p) => p.code)).toEqual(['ARN']);
    expect(matchPlaces(list, 'ar', { exclude: new Set(), limit: 8, lang: 'en-GB' }).map((p) => p.code)).toEqual(['ARC', 'ARN', 'BAR']);
  });
});

describe('comboKey', () => {
  const closed = { open: false, active: -1 };
  const open = (active: number) => ({ open: true, active });

  it('opens on ArrowDown and moves down, clamped to the last row', () => {
    expect(comboKey(closed, 'ArrowDown', 3)).toEqual({ state: open(0) });
    expect(comboKey(open(0), 'ArrowDown', 3)).toEqual({ state: open(1) });
    expect(comboKey(open(2), 'ArrowDown', 3)).toEqual({ state: open(2) });
  });

  it('opens on ArrowUp at the last row and moves up, clamped to the first', () => {
    expect(comboKey(closed, 'ArrowUp', 3)).toEqual({ state: open(2) });
    expect(comboKey(open(0), 'ArrowUp', 3)).toEqual({ state: open(0) });
  });

  it('jumps with Home and End only while open', () => {
    expect(comboKey(open(1), 'Home', 3)).toEqual({ state: open(0) });
    expect(comboKey(open(1), 'End', 3)).toEqual({ state: open(2) });
    expect(comboKey(closed, 'Home', 3)).toBeUndefined();
  });

  it('picks the active row on Enter', () => {
    expect(comboKey(open(1), 'Enter', 3)).toEqual({ state: closed, pick: 1 });
    expect(comboKey(open(-1), 'Enter', 3)).toBeUndefined();
  });

  it('closes on Escape', () => {
    expect(comboKey(open(1), 'Escape', 3)).toEqual({ state: closed });
    expect(comboKey(closed, 'Escape', 3)).toBeUndefined();
  });

  it('does nothing with no rows or another key', () => {
    expect(comboKey(closed, 'ArrowDown', 0)).toBeUndefined();
    expect(comboKey(open(0), 'a', 3)).toBeUndefined();
  });
});

describe('matchPlaces over the full place list', () => {
  const PLACES = STATIC.places as Place[];
  // About 5 ms here when every keystroke folded every name; a phone runs several times slower.
  const KEYSTROKE_MS = 3;
  const QUERIES = ['m', 'mo', 'mos', 'mosc', 'lon', 'saint', 'svo', 'warsz', 'zz', 'new y', 'san ', 'b'];

  it('answers a keystroke within budget once the list is folded', () => {
    const ROUNDS = 5;
    for (const lang of ['en-GB', 'pl']) {
      const opts = { exclude: new Set(['LON']), limit: WEB_SEARCH.placeMatches, lang };
      matchPlaces(PLACES, 'a', opts);
      // The best of a few rounds, so other test files running alongside do not count.
      const rounds = Array.from({ length: ROUNDS }, () => {
        const started = performance.now();
        for (const q of QUERIES) matchPlaces(PLACES, q, opts);
        return (performance.now() - started) / QUERIES.length;
      });
      expect(Math.min(...rounds)).toBeLessThan(KEYSTROKE_MS);
    }
  });

  it('finds the places the 1.8.0 list added, member airports by their exact code only', () => {
    const find = (q: string, lang = 'en-GB') =>
      matchPlaces(PLACES, q, { exclude: new Set(), limit: WEB_SEARCH.placeMatches, lang }).map((p) => p.code);
    expect(find('moscow')[0]).toBe('MOW');
    expect(find('moskwa', 'pl')[0]).toBe('MOW');
    expect(find('SVO')[0]).toBe('MOW');
    expect(find('SVO')).not.toContain('SVO');
    expect(find('minsk')[0]).toBe('MSQ');
  });
});

describe('matchPlaces folds each list once per language', () => {
  it('follows a new list and a new language', () => {
    const before = [{ code: 'WAR', name: 'Warsaw', top: true, names: { de: 'Warschau' } }];
    const after = [{ code: 'WAR', name: 'Warsaw', top: true, names: { de: 'Warschau', pl: 'Warszawa' } }];
    const find = (list: Place[], q: string, lang: string) => matchPlaces(list, q, { exclude: new Set(), limit: 8, lang }).map((p) => p.code);
    expect(find(before, 'warsch', 'de')).toEqual(['WAR']);
    expect(find(before, 'warsz', 'pl')).toEqual([]);
    expect(find(after, 'warsz', 'pl')).toEqual(['WAR']);
    expect(find(after, 'warsch', 'pl')).toEqual([]);
  });
});
