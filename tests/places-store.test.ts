import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_TRIP, WEB_SEARCH } from '../src/app';
import { exampleCity } from '../src/example-city';
import type { Place, PlacesAnswer } from '../src/scripts/ffly-api';
import { PlacesStore, WEB_META, fetchStaticPlaces, provisionalMeta, type PlaceSet } from '../src/scripts/places-store';

const place = (code: string, name: string, names?: Record<string, string>): Place => ({ code, name, top: true, names });
const STATIC: PlaceSet = { version: 'v1', places: [place('WAR', 'Warsaw')] };
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
const sources = (over: Partial<NonNullable<ConstructorParameters<typeof PlacesStore>[1]>> = {}) => ({
  staticVersion: STATIC.version,
  loadStatic: vi.fn(async () => STATIC),
  fetchPlaces: vi.fn(async (_version?: string): Promise<PlacesAnswer> => ({ kind: 'fresh', version: 'v3', places: LIVE })),
  ...over,
});

describe('PlacesStore at first paint', () => {
  it('opens on the stored places, else on nothing until they load', () => {
    expect(new PlacesStore(box(STORED), sources()).current).toEqual(STORED);
    expect(new PlacesStore(box(), sources()).current).toBeUndefined();
    expect(new PlacesStore(undefined, sources()).current).toBeUndefined();
  });

  it('ignores a stored value it cannot read', () => {
    const b = box();
    b.items.set(WEB_SEARCH.placesKey, '{"version":"v9","places":[]}');
    expect(new PlacesStore(b, sources()).current).toBeUndefined();
    b.items.set(WEB_SEARCH.placesKey, 'not json');
    expect(new PlacesStore(b, sources()).current).toBeUndefined();
  });
});

describe('PlacesStore.load', () => {
  it('answers the stored places without fetching the static file', async () => {
    const s = sources();
    expect(await new PlacesStore(box(STORED), s).load()).toEqual(STORED);
    expect(s.loadStatic).not.toHaveBeenCalled();
  });

  it('fetches the static file once, however often it is asked, and stores it', async () => {
    const b = box();
    const s = sources();
    const store = new PlacesStore(b, s);
    const [first, second] = await Promise.all([store.load(), store.load()]);
    expect(first).toEqual(STATIC);
    expect(second).toEqual(STATIC);
    expect(s.loadStatic).toHaveBeenCalledTimes(1);
    expect(stored(b)).toEqual(STATIC);
    expect(store.current).toEqual(STATIC);
  });

  it('answers nothing when the static file fails, and tries again next time', async () => {
    const loadStatic = vi.fn<() => Promise<PlaceSet>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(STATIC);
    const store = new PlacesStore(box(), sources({ loadStatic }));
    expect(await store.load()).toBeUndefined();
    expect(await store.load()).toEqual(STATIC);
  });

  it('never replaces a list a refresh already chose', async () => {
    let finish!: (set: PlaceSet) => void;
    const store = new PlacesStore(box(), sources({ loadStatic: () => new Promise<PlaceSet>((resolve) => (finish = resolve)) }));
    const loading = store.load();
    await store.refresh(meta('v3'));
    finish(STATIC);
    expect(await loading).toEqual({ version: 'v3', places: LIVE });
  });
});

describe('PlacesStore.refresh', () => {
  it('asks nothing while the version is the one it holds', async () => {
    const s = sources();
    const store = new PlacesStore(box(STORED), s);
    expect(await store.refresh(meta('v2'))).toBe(store.current);
    expect(s.fetchPlaces).not.toHaveBeenCalled();
    expect(s.loadStatic).not.toHaveBeenCalled();
  });

  it('takes the static file, not the API, when it is the live version', async () => {
    const b = box(STORED);
    const s = sources();
    const store = new PlacesStore(b, s);
    expect(await store.refresh(meta('v1'))).toEqual(STATIC);
    expect(s.fetchPlaces).not.toHaveBeenCalled();
    expect(stored(b)).toEqual(STATIC);
  });

  it('asks the API when the static file turns out older than its build said', async () => {
    const s = sources({ loadStatic: vi.fn(async () => ({ version: 'v0', places: [place('WAR', 'Warsaw')] })) });
    expect((await new PlacesStore(box(), s).refresh(meta('v1'))).places).toEqual(LIVE);
    expect(s.fetchPlaces).toHaveBeenCalledWith(undefined);
  });

  it('fetches a new version conditionally on the one it holds, then stores it', async () => {
    const b = box(STORED);
    const s = sources();
    const store = new PlacesStore(b, s);
    const set = await store.refresh(meta('v3'));
    expect(s.fetchPlaces).toHaveBeenCalledWith('v2');
    expect(set).toEqual({ version: 'v3', places: LIVE });
    expect(stored(b)).toEqual(set);
    expect(store.current).toEqual(set);
  });

  it("keeps only the site's languages of the API's names", async () => {
    const names = { de: 'Warschau', pl: 'Warszawa', 'pt-BR': 'Varsóvia', ja: 'ワルシャワ', uk: 'Варшава' };
    const s = sources({ fetchPlaces: async () => ({ kind: 'fresh', version: 'v3', places: [place('WAR', 'Warsaw', names)] }) });
    const set = await new PlacesStore(box(), s).refresh(meta('v3'));
    expect(set.places[0].names).toEqual({ de: 'Warschau', pl: 'Warszawa', 'pt-BR': 'Varsóvia' });
  });

  it('takes the version from /meta when the answer carries none', async () => {
    const store = new PlacesStore(box(STORED), sources({ fetchPlaces: async () => ({ kind: 'fresh', places: LIVE }) }));
    expect((await store.refresh(meta('v3'))).version).toBe('v3');
  });

  it('keeps the stored list on a 304', async () => {
    const b = box(STORED);
    const store = new PlacesStore(b, sources({ fetchPlaces: async () => ({ kind: 'same' }) }));
    expect(await store.refresh(meta('v3'))).toEqual(STORED);
    expect(b.setItem).not.toHaveBeenCalled();
  });

  it('uses /meta places, unstored, when the API has no version or /places fails', async () => {
    const b = box(STORED);
    const old = new PlacesStore(b, sources());
    expect(await old.refresh(meta(undefined))).toEqual({ version: null, places: meta().places });
    const offline = async (): Promise<PlacesAnswer> => {
      throw new Error('offline');
    };
    const failing = new PlacesStore(b, sources({ fetchPlaces: offline }));
    expect(await failing.refresh(meta('v3'))).toEqual({ version: null, places: meta().places });
    expect(stored(b)).toEqual(STORED);
  });

  it('survives a storage that refuses to write', async () => {
    const b = box();
    b.setItem.mockImplementation(() => {
      throw new Error('full');
    });
    expect((await new PlacesStore(b, sources()).refresh(meta('v3'))).places).toEqual(LIVE);
  });
});

describe('fetchStaticPlaces', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (response: () => Response) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => response());
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('reads the same-origin static file', async () => {
    const fetch = stub(() => new Response(JSON.stringify(STATIC)));
    expect(await fetchStaticPlaces()).toEqual(STATIC);
    expect(fetch.mock.calls[0][0]).toBe(WEB_SEARCH.placesUrl);
  });

  it('rejects an error status or a body that is not a place list', async () => {
    stub(() => new Response('{}', { status: 404 }));
    await expect(fetchStaticPlaces()).rejects.toThrow();
    stub(() => new Response('{"version":"v1","places":[]}'));
    await expect(fetchStaticPlaces()).rejects.toThrow();
  });
});

describe('the bundled head', () => {
  it('holds the limits the form opens on, and no places', () => {
    const start = provisionalMeta();
    expect(start.free_searches_left).toBeNull();
    expect(start.places).toEqual([]);
    expect(start.tier_limits.max_cities).toBeGreaterThan(0);
    expect(start.limits.max_window_days).toBeGreaterThan(0);
    expect(WEB_META).not.toHaveProperty('places');
  });
});

describe('the static place list', () => {
  it('names every example trip city, in English when it has no other name', () => {
    for (const stop of EXAMPLE_TRIP.stops) expect(exampleCity(stop, 'en-GB')).toBe(stop.city);
  });
});
