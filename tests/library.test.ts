import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/app';
import type { Route, SearchRequest } from '../src/scripts/ffly-api';
import { Library, routeKey, toggleCompare, type SavedRoute } from '../src/scripts/library';

const request: SearchRequest = {
  start: 'WAW', ends: ['WAW'], cities: ['MAD'], date_from: '2026-11-01', date_to: '2026-11-08', min_nights: 2, max_nights: 4, client_request_id: 'a',
};
const route = (day: string): Route => ({
  locked: false,
  price: 100,
  n_cities: 1,
  places: ['WAW', 'MAD', 'WAW'],
  legs: [{ from_place: 'WAW', to_place: 'MAD', stops: 0, origin: 'WMI', dest: 'MAD', day, dep: '06:00' }],
});
const saved = (i: number): SavedRoute => {
  const r = route(`2026-11-${String((i % 28) + 1).padStart(2, '0')}T${i}`);
  return { key: routeKey(r), route: r, request, currency: 'EUR', searched: 1, saved: i };
};

class MemoryStore {
  items = new Map<string, string>();
  quota = Infinity;
  getItem = (key: string) => this.items.get(key) ?? null;
  setItem = (key: string, value: string) => {
    if (value.length > this.quota) throw new DOMException('full', 'QuotaExceededError');
    this.items.set(key, value);
  };
}

describe('saved routes', () => {
  it('keep one entry per distinct route, newest first, dropping the oldest past the cap', () => {
    const library = new Library(new MemoryStore());
    for (let i = 0; i < LIBRARY.maxSaved + 2; i += 1) library.save(saved(i));
    library.save(saved(10));
    const list = library.saved();
    expect(list).toHaveLength(LIBRARY.maxSaved);
    expect(list[0].saved).toBe(10);
    expect(list.filter((entry) => entry.key === saved(10).key)).toHaveLength(1);
    expect(list.some((entry) => entry.saved === 0)).toBe(false);
  });

  it('say so when the browser keeps nothing, and read nothing broken', () => {
    expect(new Library(undefined).save(saved(1))).toBe(false);
    const store = new MemoryStore();
    store.quota = 10;
    expect(new Library(store).save(saved(1))).toBe(false);
    store.items.set(LIBRARY.savedKey, '{not json');
    expect(new Library(store).saved()).toEqual([]);
  });

  it('leave out an entry the sheet could not show, keeping the others', () => {
    const store = new MemoryStore();
    const broken = [{ ...saved(2), currency: 'euro' }, { ...saved(3), request: { ...request, date_to: undefined } }, { ...saved(4), searched: 'now' }];
    store.items.set(LIBRARY.savedKey, JSON.stringify([saved(1), ...broken]));
    expect(new Library(store).saved().map((entry) => entry.saved)).toEqual([1]);
  });
});

describe('history', () => {
  const entry = (i: number) => ({ key: `k${i}`, request, view: { id: `s${i}`, routes: [route('2026-11-02')] }, currency: 'EUR', searched: i });

  it('keeps the last searches and makes room by dropping the oldest when the browser is full', () => {
    const store = new MemoryStore();
    const library = new Library(store);
    for (let i = 0; i < LIBRARY.maxHistory + 3; i += 1) library.record(entry(i));
    expect(library.history()).toHaveLength(LIBRARY.maxHistory);
    expect(library.history()[0].key).toBe(`k${LIBRARY.maxHistory + 2}`);
    store.quota = store.items.get(LIBRARY.historyKey)!.length;
    expect(library.record(entry(99))).toBe(true);
    expect(library.history()[0].key).toBe('k99');
    expect(library.history().length).toBeLessThan(LIBRARY.maxHistory);
  });
});

describe('compare', () => {
  it('takes two or three routes and refuses a fourth', () => {
    const three = ['a', 'b', 'c'].reduce((list, key) => toggleCompare(list, key), [] as string[]);
    expect(three).toEqual(['a', 'b', 'c']);
    expect(toggleCompare(three, 'd')).toEqual(three);
    expect(toggleCompare(three, 'b')).toEqual(['a', 'c']);
  });
});

describe('passports and ratings', () => {
  it('keep country codes only, sorted, and one settled rating per search', () => {
    const library = new Library(new MemoryStore());
    library.setPassports(['UA', 'PL', 'UA']);
    expect(library.passports()).toEqual(['PL', 'UA']);
    library.rate('s1', 2);
    expect(library.rating('s1')).toBe(2);
    expect(library.rating('s2')).toBeUndefined();
  });
});
