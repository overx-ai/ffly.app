import { describe, expect, it } from 'vitest';
import STATIC from '../public/places.json';
import { LANGS } from '../src/i18n/locales';
import type { Place } from '../src/scripts/ffly-api';
import { addPlace, cityOf, countryNamer, fold, localOf, optionParts, placeName, removePlace, withLanguages } from '../src/scripts/places';

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

describe('countryNamer', () => {
  it("names a country in the page's language", () => {
    expect(countryNamer('en-GB')('CA')).toBe('Canada');
    expect(countryNamer('de')('GB')).toBe('Vereinigtes Königreich');
    expect(countryNamer('pl')('RU')).toBe('Rosja');
  });

  it('says nothing for no country or a code it cannot name', () => {
    const name = countryNamer('en-GB');
    expect(name(null)).toBe('');
    expect(name(undefined)).toBe('');
    expect(name('XX')).toBe('');
    expect(name('not a code')).toBe('');
  });
});

describe('withLanguages', () => {
  it('keeps the names in the given languages and their regional variants only', () => {
    const places = [
      { code: 'WAR', name: 'Warsaw', top: true, names: { de: 'Warschau', 'pt-BR': 'Varsóvia', ja: 'ワルシャワ' } },
      { code: 'VNO', name: 'Vilnius', top: true, names: null },
      { code: 'RIX', name: 'Riga', top: true },
    ];
    expect(withLanguages(places, ['de', 'pt']).map((p) => p.names)).toEqual([{ de: 'Warschau', 'pt-BR': 'Varsóvia' }, null, undefined]);
  });
});

describe('withLanguages and the local name', () => {
  const warsaw = { code: 'WAR', name: 'Warsaw', top: true, country: 'PL', names: { de: 'Warschau', pl: 'Warszawa', ru: 'Варшава' } };
  const prague = { code: 'PRG', name: 'Prague', top: true, country: 'CZ', names: { cs: 'Praha', de: 'Prag' } };

  it("keeps the city's own name when its language is not one of the site's", () => {
    expect(withLanguages([warsaw], ['en', 'de'])[0]).toEqual({ ...warsaw, names: { de: 'Warschau' }, local: 'Warszawa' });
    expect(withLanguages([prague], ['en', 'de'])[0]).toEqual({ ...prague, names: { de: 'Prag' }, local: 'Praha' });
  });

  it('keeps no separate local name when the names already hold it, or it is the English name', () => {
    expect(withLanguages([warsaw], ['en', 'pl'])[0]).toEqual({ ...warsaw, names: { pl: 'Warszawa' } });
    const oslo = { code: 'OSL', name: 'Oslo', top: true, country: 'NO', names: { de: 'Oslo' } };
    expect(withLanguages([oslo], ['en'])[0]).toEqual({ ...oslo, names: {} });
  });

  it('keeps none for a country whose language has no names, or a place with no country', () => {
    const reykjavik = { code: 'REK', name: 'Reykjavik', top: true, country: 'IS', names: { de: 'Reykjavík' } };
    expect(withLanguages([reykjavik], ['en'])[0]).not.toHaveProperty('local');
    const nowhere = { code: 'XXX', name: 'Nowhere', top: false, country: null, names: { pl: 'Nigdzie' } };
    expect(withLanguages([nowhere], ['en'])[0]).not.toHaveProperty('local');
  });

  it("takes a country's regional names first, as placeName does", () => {
    const rio = { code: 'RIO', name: 'Rio de Janeiro', top: true, country: 'BR', names: { pt: 'Rio de Janeiro (PT)', 'pt-BR': 'Rio' } };
    expect(withLanguages([rio], ['en'])[0].local).toBe('Rio');
  });
});

describe('localOf', () => {
  it('reads a kept local name, else the name in the country language the site keeps', () => {
    expect(localOf({ name: 'Prague', country: 'CZ', local: 'Praha' })).toEqual({ name: 'Praha', lang: 'cs' });
    expect(localOf({ name: 'Warsaw', country: 'PL', names: { pl: 'Warszawa' } })).toEqual({ name: 'Warszawa', lang: 'pl' });
    expect(localOf({ name: 'Oslo', country: 'NO', names: {} })).toBeUndefined();
    expect(localOf({ name: 'London', country: 'GB' })).toBeUndefined();
  });
});

describe('optionParts over the full place list', () => {
  const PLACES = STATIC.places as Place[];
  const at = (code: string) => PLACES.find((p) => p.code === code)!;

  it('labels a city with more than one airport, never a single airport or an airport row', () => {
    expect(optionParts(at('WAR'), 'en-GB')).toMatchObject({ airports: ['WAW', 'WMI'], allAirports: true });
    expect(optionParts(at('LON'), 'de').allAirports).toBe(true);
    expect(optionParts(at('MAD'), 'en-GB')).toMatchObject({ airports: [], allAirports: false });
    expect(optionParts(at('WAW'), 'en-GB')).toMatchObject({ airports: [], allAirports: false });
  });

  it('shows the name the chosen field shows, then the English and the local name only where they differ', () => {
    expect(optionParts(at('WAR'), 'en-GB')).toMatchObject({ name: 'Warsaw', english: '', local: { name: 'Warszawa', lang: 'pl' } });
    expect(optionParts(at('WAR'), 'de')).toMatchObject({ name: 'Warschau', english: 'Warsaw', local: { name: 'Warszawa', lang: 'pl' } });
    expect(optionParts(at('WAR'), 'pl')).toMatchObject({ name: 'Warszawa', english: 'Warsaw', local: undefined });
    expect(optionParts(at('MOW'), 'en-GB').local).toEqual({ name: 'Москва', lang: 'ru' });
    for (const code of ['WAR', 'LON', 'MOW']) expect(optionParts(at(code), 'de').name).toBe(placeName(at(code), 'de'));
  });
});

describe('public/places.json', () => {
  // The stored copy is marked with the site's languages, so a file built before a language was added would pass as complete.
  it("carries the names of exactly the site's languages", () => {
    const kept = new Set((STATIC.places as Place[]).flatMap((p) => Object.keys(p.names ?? {}).map((key) => key.split('-')[0])));
    expect([...kept].sort()).toEqual(LANGS.map((l) => l.code).filter((code) => code !== 'en').sort());
  });
});
