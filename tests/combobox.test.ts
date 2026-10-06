import { describe, expect, it } from 'vitest';
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
