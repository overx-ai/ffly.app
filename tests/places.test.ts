import { describe, expect, it } from 'vitest';
import { addPlace, cityOf, fold, placeName, removePlace } from '../src/scripts/places';

describe('addPlace', () => {
  it('appends in the order picked, up to the cap', () => {
    expect(addPlace([], 'WAW', 2)).toEqual(['WAW']);
    expect(addPlace(['WAW'], 'VNO', 2)).toEqual(['WAW', 'VNO']);
  });

  it('refuses a third once the cap is reached', () => {
    expect(addPlace(['WAW', 'VNO'], 'KRK', 2)).toEqual(['WAW', 'VNO']);
  });

  it('replaces the one pick when the cap is 1', () => {
    expect(addPlace(['WAW'], 'VNO', 1)).toEqual(['VNO']);
    expect(addPlace([], 'VNO', 1)).toEqual(['VNO']);
  });

  it('refuses a duplicate, also at a cap of 1', () => {
    expect(addPlace(['WAW'], 'WAW', 3)).toEqual(['WAW']);
    expect(addPlace(['WAW'], 'WAW', 1)).toEqual(['WAW']);
  });

  it('never changes the list it was given', () => {
    const list = ['WAW'];
    addPlace(list, 'VNO', 3);
    expect(list).toEqual(['WAW']);
  });
});

describe('removePlace', () => {
  it('drops the code and keeps the order of the rest', () => {
    expect(removePlace(['WAW', 'VNO', 'KRK'], 'VNO')).toEqual(['WAW', 'KRK']);
    expect(removePlace(['WAW'], 'XXX')).toEqual(['WAW']);
  });
});

describe('placeName', () => {
  const lisbon = { name: 'Lisbon', names: { pt: 'Lisboa', 'pt-BR': 'Lisboa (BR)', de: 'Lissabon', fr: '' } };

  it('takes the exact language first, then its base language', () => {
    expect(placeName(lisbon, 'pt-BR')).toBe('Lisboa (BR)');
    expect(placeName(lisbon, 'pt-PT')).toBe('Lisboa');
    expect(placeName(lisbon, 'de')).toBe('Lissabon');
  });

  it('falls back to the English name for a missing or empty language, or no names at all', () => {
    expect(placeName(lisbon, 'pl')).toBe('Lisbon');
    expect(placeName(lisbon, 'fr')).toBe('Lisbon');
    expect(placeName(lisbon, 'en-GB')).toBe('Lisbon');
    expect(placeName({ name: 'Lisbon', names: null }, 'pt-PT')).toBe('Lisbon');
    expect(placeName({ name: 'Lisbon' }, 'pt-PT')).toBe('Lisbon');
  });
});

describe('fold', () => {
  it('drops case and diacritics, letters NFD keeps whole included', () => {
    expect(fold('Kraków')).toBe('krakow');
    expect(fold('ŁÓDŹ')).toBe('lodz');
    expect(fold('Málaga')).toBe('malaga');
    expect(fold('Düsseldorf')).toBe('dusseldorf');
    expect(fold('København')).toBe('kobenhavn');
  });
});

describe('cityOf', () => {
  const places = [
    { code: 'WAW', name: 'Warsaw', top: false },
    { code: 'WAR', name: 'Warsaw', top: true, airports: ['WAW', 'WMI'] },
    { code: 'VNO', name: 'Vilnius', top: true },
  ];

  it('finds the city an airport belongs to, else the place with that code', () => {
    expect(cityOf(places, 'WAW')?.code).toBe('WAR');
    expect(cityOf(places, 'VNO')?.code).toBe('VNO');
    expect(cityOf(places, 'XXX')).toBeUndefined();
  });
});
