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

const codes = (query: string, exclude: string[] = [], limit = 10) =>
  matchPlaces(places, query, { exclude: new Set(exclude), limit }).map((p) => p.code);

describe('matchPlaces', () => {
  it('matches the prefix of a name or a code, ignoring case', () => {
    expect(codes('war')).toEqual(['WAW', 'WMI']);
    expect(codes('wmi')).toEqual(['WMI']);
    expect(codes('saw')).toEqual([]);
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
