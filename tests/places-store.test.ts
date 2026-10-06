import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_TRIP, WEB_SEARCH } from '../src/app';
import { exampleCity } from '../src/example-city';
import { LANGS } from '../src/i18n/locales';
import type { Place, PlacesAnswer } from '../src/scripts/ffly-api';
import { PLACES_LANGS, PlacesStore, WEB_META, fetchStaticPlaces, provisionalMeta, type PlaceSet } from '../src/scripts/places-store';

const place = (code: string, name: string, names?: Record<string, string>): Place => ({ code, name, top: true, names });
const STATIC: PlaceSet = { version: 'v1', places: [place('WAR', 'Warsaw')] };
const STORED: PlaceSet = { version: 'v2', places: [place('WAR', 'Warsaw', { de: 'Warschau' })] };
const LIVE = [place('WAR', 'Warsaw', { de: 'Warschau', pl: 'Warszawa' })];

// langs null: a list stored before the site's languages were marked.
function box(initial?: PlaceSet, langs: string | null = PLACES_LANGS) {
  const items = new Map<string, string>();
  if (initial) items.set(WEB_SEARCH.placesKey, JSON.stringify(langs === null ? initial : { ...initial, langs }));
  return {
    items,
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void items.set(key, value)),
  };
}

function stored(b: ReturnType<typeof box>): PlaceSet | null {
  const value = JSON.parse(b.items.get(WEB_SEARCH.placesKey) ?? 'null') as (PlaceSet & { langs?: string }) | null;
  if (!value) return null;
  const { langs, ...set } = value;
  expect(langs).toBe(PLACES_LANGS);
  return set;
}
const META_PLACES = [place('WAR', 'Warsaw (meta)')];
const meta = (places_version?: string | null, places: Place[] | undefined = META_PLACES) => ({ places, places_version });
const offline = async (): Promise<never> => {
  throw new Error('offline');
};
const calls = (f: unknown) => (vi.isMockFunction(f) ? f.mock.calls.length : 0);
const fetches = (s: ReturnType<typeof sources>) => calls(s.loadStatic) + calls(s.fetchPlaces);
const sources = (over: Partial<NonNullable<ConstructorParameters<typeof PlacesStore>[1]>> = {}) => ({
  staticVersion: STATIC.version,
  loadStatic: vi.fn(async () => STATIC),
  fetchPlaces: vi.fn(async (_version?: string): Promise<PlacesAnswer> => ({ kind: 'fresh', version: 'v3', places: LIVE })),
  ...over,
});

describe('PlacesStore at first paint', () => {
  it('reads no storage until the places are asked for', () => {
    const b = box(STORED);
    new PlacesStore(b, sources());
    expect(b.getItem).not.toHaveBeenCalled();
  });
});

describe('PlacesStore.load', () => {
  it('loads the stored places without fetching, reading the storage once', async () => {
    const b = box(STORED);
    const s = sources();
    const store = new PlacesStore(b, s);
    expect(await store.load()).toEqual(STORED);
    expect(await store.load()).toEqual(STORED);
    expect(fetches(s)).toBe(0);
    expect(b.getItem).toHaveBeenCalledTimes(1);
  });

  it('treats a stored value it cannot read as absent: one fetch of the static file', async () => {
    for (const broken of ['{"version":"v9","places":[]}', '{"version":"v9","places":[{"code":"WAR"}]}', '{"places":[]}', 'not json']) {
      const b = box();
      b.items.set(WEB_SEARCH.placesKey, broken);
      const s = sources();
      expect(await new PlacesStore(b, s).load()).toEqual(STATIC);
      expect(fetches(s)).toBe(1);
      expect(stored(b)).toEqual(STATIC);
    }
  });

  it('loads without any storage at all, or with one that refuses to be read', async () => {
    expect(await new PlacesStore(undefined, sources()).load()).toEqual(STATIC);
    const blocked = box(STORED);
    blocked.getItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(await new PlacesStore(blocked, sources()).load()).toEqual(STATIC);
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
    expect(await store.refresh(meta('v2'))).toEqual(STORED);
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

  it('keeps the list it holds when the API has no version or /places fails', async () => {
    const b = box(STORED);
    expect(await new PlacesStore(b, sources()).refresh(meta(undefined))).toEqual(STORED);
    expect(await new PlacesStore(b, sources({ fetchPlaces: offline })).refresh(meta('v3'))).toEqual(STORED);
    expect(stored(b)).toEqual(STORED);
  });

  it('falls back to the static list, then to /meta places, never storing an unversioned list', async () => {
    const b = box();
    expect(await new PlacesStore(b, sources()).refresh(meta(undefined))).toEqual(STATIC);
    expect(await new PlacesStore(box(), sources({ fetchPlaces: offline })).refresh(meta('v3'))).toEqual(STATIC);
    const none = box();
    const store = new PlacesStore(none, sources({ loadStatic: offline, fetchPlaces: offline }));
    expect(await store.refresh(meta('v3'))).toEqual({ version: null, places: META_PLACES });
    expect(await new PlacesStore(none, sources({ loadStatic: offline })).refresh(meta(undefined))).toEqual({ version: null, places: META_PLACES });
    expect(none.setItem).not.toHaveBeenCalled();
  });

  it('answers an empty list when nothing at all has places, and an empty /meta never replaces a list', async () => {
    const lost = sources({ loadStatic: offline, fetchPlaces: offline });
    expect(await new PlacesStore(box(), lost).refresh({ places_version: 'v3' })).toEqual({ version: null, places: [] });
    const store = new PlacesStore(box(), sources({ fetchPlaces: offline }));
    await store.load();
    expect(await store.refresh(meta(undefined, []))).toEqual(STATIC);
    expect(await store.load()).toEqual(STATIC);
  });

  it('survives a storage that refuses to write', async () => {
    const b = box();
    b.setItem.mockImplementation(() => {
      throw new Error('full');
    });
    expect((await new PlacesStore(b, sources()).refresh(meta('v3'))).places).toEqual(LIVE);
  });
});

// The API's places_version is a hash of the list's content, so a stored list at that version is valid as it is.
describe('PlacesStore validity', () => {
  it('fetches nothing, ever, while the stored version is the live one', async () => {
    const s = sources();
    const store = new PlacesStore(box(STORED), s);
    await store.load();
    await store.refresh(meta('v2'));
    await store.load();
    expect(s.loadStatic).not.toHaveBeenCalled();
    expect(s.fetchPlaces).not.toHaveBeenCalled();
  });

  it('fetches a new version once, then never again on the next visit', async () => {
    for (const [version, which] of [['v1', 'loadStatic'], ['v3', 'fetchPlaces']] as const) {
      const b = box(STORED);
      const s = sources();
      const store = new PlacesStore(b, s);
      await store.load();
      await store.refresh(meta(version));
      expect(fetches(s)).toBe(1);
      expect(s[which]).toHaveBeenCalledTimes(1);
      expect(stored(b)?.version).toBe(version);

      const next = sources();
      const visit = new PlacesStore(b, next);
      await visit.load();
      await visit.refresh(meta(version));
      await visit.load();
      expect(fetches(next)).toBe(0);
    }
  });

  it("ignores a list stored for other languages, or before the site's languages were marked, and replaces it", async () => {
    for (const langs of [null, 'en,de', `${PLACES_LANGS},xx`]) {
      const b = box(STORED, langs);
      const s = sources();
      const store = new PlacesStore(b, s);
      expect(await store.load()).toEqual(STATIC);
      await store.refresh(meta('v1'));
      expect(fetches(s)).toBe(1);
      expect(stored(b)).toEqual(STATIC);
    }
  });

  it('marks the stored list with every language of the site, so a new language is a new list', () => {
    expect(PLACES_LANGS).toBe(LANGS.map((l) => l.code).join(','));
  });

  it('fetches once over a corrupt stored entry', async () => {
    const b = box();
    b.items.set(WEB_SEARCH.placesKey, '{"version":"v1","places":');
    const s = sources();
    const store = new PlacesStore(b, s);
    await store.load();
    await store.refresh(meta('v1'));
    expect(fetches(s)).toBe(1);
  });
});

describe('fetchStaticPlaces', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (response: () => Response) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => response());
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('reads the same-origin static file under its version and languages, so each list has its own URL', async () => {
    const fetch = stub(() => new Response(JSON.stringify(STATIC)));
    expect(await fetchStaticPlaces()).toEqual(STATIC);
    expect(fetch.mock.calls[0][0]).toBe(
      `${WEB_SEARCH.placesUrl}?v=${encodeURIComponent(WEB_META.places_version)}&l=${encodeURIComponent(PLACES_LANGS)}`,
    );
    expect(WEB_META.places_version).toBeTruthy();
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
    expect(start.places).toBeUndefined();
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
