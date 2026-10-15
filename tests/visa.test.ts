// The app's VisaRulesTests (ios-ffly spec 029), on the web's port.
import { describe, expect, it } from 'vitest';
import file from '../public/visa.json';
import { PASSPORTS, countriesNeedingVisa, matchPassports, needsVisa, readTable, stayCities, warnsConnection } from '../src/scripts/visa';

const table = { PL: ['GB', 'US'], UA: ['GB'], GB: [] };
const countries: Record<string, string> = { WAR: 'PL', BCN: 'ES', LON: 'GB', MAN: 'GB', ROM: 'IT', IST: 'TR' };
const countryOf = (code: string) => countries[code];

describe('needsVisa', () => {
  it('clears a country when any passport enters visa-free, and never judges an unknown one', () => {
    expect(needsVisa(table, 'GB', ['PL', 'UA'])).toBe(true);
    expect(needsVisa(table, 'US', ['PL', 'UA'])).toBe(false);
    expect(needsVisa(table, 'GB', [])).toBe(false);
    expect(needsVisa(table, 'GB', ['PL', 'XX'])).toBe(false);
    expect(needsVisa(table, 'ZZ', ['PL'])).toBe(false);
  });
});

describe('countriesNeedingVisa', () => {
  it('names each country once, in the cities order', () => {
    expect(countriesNeedingVisa(table, ['ROM', 'LON', 'MAN'], undefined, countryOf, ['PL'])).toEqual(['GB']);
    expect(countriesNeedingVisa(table, ['LON'], undefined, countryOf, [])).toEqual([]);
  });

  it('flags no Schengen stay on a trip that starts inside the Schengen area', () => {
    const turkish = { TR: ['ES', 'GB'] };
    expect(countriesNeedingVisa(turkish, ['BCN', 'LON'], 'WAR', countryOf, ['TR'])).toEqual(['GB']);
    expect(countriesNeedingVisa(turkish, ['BCN', 'LON'], 'IST', countryOf, ['TR'])).toEqual(['ES', 'GB']);
  });
});

describe('warnsConnection', () => {
  it('flags a connecting leg unless it hops inside the Schengen area', () => {
    expect(warnsConnection({ from_place: 'WAR', to_place: 'BCN', stops: 1 }, countryOf)).toBe(false);
    expect(warnsConnection({ from_place: 'WAR', to_place: 'LON', stops: 1 }, countryOf)).toBe(true);
    expect(warnsConnection({ from_place: 'IST', to_place: 'BCN', stops: 1 }, countryOf)).toBe(true);
    expect(warnsConnection({ from_place: 'WAR', to_place: 'ROM', stops: 0 }, countryOf)).toBe(false);
  });
});

describe('stayCities', () => {
  it('are the cities between start and end, the visited one it ends in, and a one-way destination', () => {
    const route = { locked: false, price: 1, n_cities: 2, places: ['WAR', 'ROM', 'LON', 'WAR'] };
    expect(stayCities(route, { start: 'WAR', cities: ['ROM', 'LON'] })).toEqual(['ROM', 'LON']);
    expect(stayCities({ ...route, places: ['WAR', 'ROM', 'LON'] }, { start: 'WAR', cities: ['ROM', 'LON'] })).toEqual(['ROM', 'LON']);
    expect(stayCities({ ...route, places: ['WAR', 'LON'] }, { start: 'WAR', cities: [] })).toEqual(['LON']);
  });
});

describe('the shipped table', () => {
  it('carries its MIT notice and every passport the picker offers', () => {
    expect(file.license).toMatch(/^MIT License/);
    const parsed = readTable(file)!;
    expect(Object.keys(parsed).sort()).toEqual([...PASSPORTS]);
    expect(needsVisa(parsed, 'DE', ['PL'])).toBe(false);
  });

  it('finds a passport by name or code', () => {
    const names: Record<string, string> = { PL: 'Poland', PT: 'Portugal', PY: 'Paraguay' };
    const nameOf = (code: string) => names[code] ?? code;
    expect(matchPassports('po', nameOf, [], 8)).toEqual(['PL', 'PT']);
    expect(matchPassports('py', nameOf, [], 8)[0]).toBe('PY');
    expect(matchPassports('po', nameOf, ['PL'], 8)).toEqual(['PT']);
  });
});
