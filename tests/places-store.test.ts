import { describe, expect, it, vi } from 'vitest';
import { EXAMPLE_TRIP, WEB_SEARCH } from '../src/app';
import type { Place, PlacesAnswer } from '../src/scripts/ffly-api';
import { PLACES_SNAPSHOT, PlacesStore, exampleCity, provisionalMeta, type PlaceSet } from '../src/scripts/places-store';

const place = (code: string, name: string, names?: Record<string, string>): Place => ({ code, name, top: true, names });
const SNAPSHOT: PlaceSet = { version: 'v1', places: [place('WAR', 'Warsaw')] };
const STORED: PlaceSet = { version: 'v2', places: [place('WAR', 'Warsaw', { de: 'Warschau' })] };
const LIVE = [place('WAR', 'Warsaw', { de: 'Warschau', pl: 'Warszawa' })];

function box(initial?: PlaceSet) {
  const items = new Map<string, string>();
  if (initial) items.set(WEB_SEARCH.placesKey, JSON.stringify(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => void items.set(key, value)),
  };
}

const stored = (b: ReturnType<typeof box>) => JSON.parse(b.items.get(WEB_SEARCH.placesKey) ?? 'null') as PlaceSet | null;
const meta = (places_version?: string | null) => ({ places: [place('WAR', 'Warsaw (meta)')], places_version });

describe('PlacesStore', () => {
  it('opens on the stored places, else the snapshot', () => {
    expect(new PlacesStore(box(STORED), SNAPSHOT).current).toEqual(STORED);
    expect(new PlacesStore(box(), SNAPSHOT).current).toEqual(SNAPSHOT);
    expect(new PlacesStore(undefined, SNAPSHOT).current).toEqual(SNAPSHOT);
  });

  it('ignores a stored value it cannot read', () => {
    const b = box();
    b.items.set(WEB_SEARCH.placesKey, '{"version":"v9","places":[]}');
    expect(new PlacesStore(b, SNAPSHOT).current).toEqual(SNAPSHOT);
    b.items.set(WEB_SEARCH.placesKey, 'not json');
    expect(new PlacesStore(b, SNAPSHOT).current).toEqual(SNAPSHOT);
  });

  it('asks nothing while the version is the one it holds', async () => {
    const fetchPlaces = vi.fn();
    const store = new PlacesStore(box(STORED), SNAPSHOT, fetchPlaces);
    expect(await store.refresh(meta('v2'))).toBe(store.current);
    expect(fetchPlaces).not.toHaveBeenCalled();
  });

  it('fetches a new version conditionally on the one it holds, then stores it', async () => {
    const b = box(STORED);
    const fetchPlaces = vi.fn(async (): Promise<PlacesAnswer> => ({ kind: 'fresh', version: 'v3', places: LIVE }));
    const store = new PlacesStore(b, SNAPSHOT, fetchPlaces);
    const set = await store.refresh(meta('v3'));
    expect(fetchPlaces).toHaveBeenCalledWith('v2');
    expect(set).toEqual({ version: 'v3', places: LIVE });
    expect(stored(b)).toEqual(set);
    expect(store.current).toEqual(set);
  });

  it('takes the version from /meta when the answer carries none', async () => {
    const store = new PlacesStore(box(STORED), SNAPSHOT, async () => ({ kind: 'fresh', places: LIVE }));
    expect((await store.refresh(meta('v3'))).version).toBe('v3');
  });

  it('keeps the stored list on a 304', async () => {
    const b = box(STORED);
    const store = new PlacesStore(b, SNAPSHOT, async () => ({ kind: 'same' }));
    expect(await store.refresh(meta('v3'))).toEqual(STORED);
    expect(b.setItem).not.toHaveBeenCalled();
  });

  it('switches to the snapshot without asking when it already has the new version', async () => {
    const b = box(STORED);
    const fetchPlaces = vi.fn();
    const store = new PlacesStore(b, SNAPSHOT, fetchPlaces);
    expect(await store.refresh(meta('v1'))).toEqual(SNAPSHOT);
    expect(fetchPlaces).not.toHaveBeenCalled();
    expect(stored(b)).toEqual(SNAPSHOT);
  });

  it('uses /meta places, unstored, when the API has no version or /places fails', async () => {
    const b = box(STORED);
    const old = new PlacesStore(b, SNAPSHOT, vi.fn());
    expect(await old.refresh(meta(undefined))).toEqual({ version: null, places: meta().places });
    const failing = new PlacesStore(b, SNAPSHOT, async () => {
      throw new Error('offline');
    });
    expect(await failing.refresh(meta('v3'))).toEqual({ version: null, places: meta().places });
    expect(stored(b)).toEqual(STORED);
  });

  it('survives a storage that refuses to write', async () => {
    const b = box();
    b.setItem.mockImplementation(() => {
      throw new Error('full');
    });
    const store = new PlacesStore(b, SNAPSHOT, async () => ({ kind: 'fresh', version: 'v3', places: LIVE }));
    expect((await store.refresh(meta('v3'))).places).toBe(LIVE);
  });
});

describe('the bundled snapshot', () => {
  it('holds the places and limits the form opens on', () => {
    expect(PLACES_SNAPSHOT.places.length).toBeGreaterThan(0);
    const start = provisionalMeta();
    expect(start.free_searches_left).toBeNull();
    expect(start.tier_limits.max_cities).toBeGreaterThan(0);
    expect(start.limits.max_window_days).toBeGreaterThan(0);
  });

  it('names every example trip city, in English when the snapshot has no other name', () => {
    for (const stop of EXAMPLE_TRIP.stops) expect(exampleCity(stop, 'en-GB')).toBe(stop.city);
  });
});
