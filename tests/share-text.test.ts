import { describe, expect, it } from 'vitest';
import type { Route } from '../src/scripts/ffly-api';
import { canShare, shareText, withLink } from '../src/scripts/share-text';

const names: Record<string, string> = { WAW: 'Warsaw', AMS: 'Amsterdam', ROM: 'Rome' };
const format = {
  name: (code: string) => names[code] ?? code,
  money: (n: number) => `€${n}`,
  day: (iso: string) => iso.slice(5),
  date: (date: Date) => date.toISOString().slice(0, 10),
  nights: (n: number) => `${n} nights`,
  header: '{route} · {price} for all flights',
  checked: 'Prices checked {date}',
};
const route: Route = {
  locked: false,
  price: 75,
  n_cities: 2,
  places: ['WAW', 'AMS', 'ROM', 'WAW'],
  nights: [2, 3],
  legs: [
    { from_place: 'WAW', to_place: 'AMS', stops: 0, origin: 'WAW', dest: 'AMS', day: '2026-11-25', dep: '06:00', arr: '08:30', carrier: 'X', price: 15, source: 'secret', checked_at: 1_790_000_000 },
    { from_place: 'AMS', to_place: 'ROM', stops: 0, origin: 'AMS', dest: 'FCO', day: '2026-11-27', carrier: 'Y', price: 30, source: 'secret' },
    { from_place: 'ROM', to_place: 'WAW', stops: 1, origin: 'CIA', dest: 'WMI', day: '2026-11-30', price: 30, source: 'secret', checked_at: 1_790_100_000 },
  ],
};

describe('shareText', () => {
  it('reads header, legs, the nights in each city, and when the oldest fare was checked', () => {
    const lines = shareText(route, 1_800_000_000, format).split('\n');
    expect(lines[0]).toBe('Warsaw → Amsterdam → Rome → Warsaw · €75 for all flights');
    expect(lines[1]).toBe('11-25 · 06:00–08:30 · Warsaw WAW → Amsterdam AMS · X · €15');
    expect(lines[2]).toBe('Amsterdam · 2 nights');
    expect(lines.filter((line) => line.endsWith('nights'))).toHaveLength(2);
    expect(lines.at(-1)).toBe(`Prices checked ${new Date(1_790_000_000_000).toISOString().slice(0, 10)}`);
  });

  it('never names the fare source, and a copy carries the link last', () => {
    const text = withLink(shareText(route, 1, format), 'https://ffly.app/search?from=WAW');
    expect(text).not.toContain('secret');
    expect(text.split('\n').at(-1)).toBe('https://ffly.app/search?from=WAW');
  });

  it('shares nothing a locked route does not have', () => {
    expect(canShare({ locked: true, price: 1, n_cities: 2 })).toBe(false);
    expect(canShare(route)).toBe(true);
  });
});
