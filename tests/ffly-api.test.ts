import { afterEach, describe, expect, it, vi } from 'vitest';
import { FFLY_API_BASE } from '../src/app';
import {
  buildRequest,
  canLookup,
  createSearch,
  endLimit,
  getMeta,
  getPlaces,
  getSearch,
  lookupShared,
  searchedAt,
  versionOf,
  type Meta,
} from '../src/scripts/ffly-api';

const trip = {
  start: 'WAW',
  ends: ['VNO'],
  cities: ['MAD', 'AMS'],
  dateFrom: '2026-11-01',
  dateTo: '2026-11-08',
  minNights: 2,
  maxNights: 4,
};

describe('buildRequest', () => {
  it('sends only the trip, never priority, filters or schedule', () => {
    const request = buildRequest(trip, 'id-1');
    expect(request).toEqual({
      start: 'WAW',
      ends: ['VNO'],
      cities: ['MAD', 'AMS'],
      date_from: '2026-11-01',
      date_to: '2026-11-08',
      min_nights: 2,
      max_nights: 4,
      client_request_id: 'id-1',
    });
    for (const key of ['priority', 'max_stops_per_leg', 'max_stops_total', 'schedule', 'excluded', 'pinned']) {
      expect(request).not.toHaveProperty(key);
    }
  });

  it('sends every place to finish in order, or the start when there is none', () => {
    expect(buildRequest({ ...trip, ends: ['VNO', 'FCO'] }, 'a').ends).toEqual(['VNO', 'FCO']);
    expect(buildRequest({ ...trip, ends: [] }, 'a').ends).toEqual(['WAW']);
  });

  it('copies the lists, so a later edit of the form cannot change a sent request', () => {
    const ends = ['VNO'];
    const request = buildRequest({ ...trip, ends }, 'a');
    ends.push('FCO');
    expect(request.ends).toEqual(['VNO']);
  });
});

describe('endLimit', () => {
  const meta = (tierEnds: number | undefined, maxEnds = 3) =>
    ({
      limits: { max_cities: 8, max_ends: maxEnds, max_nights: 14, max_window_days: 42 },
      tier_limits: { max_cities: 4, searches_per_day: 1, ...(tierEnds === undefined ? {} : { max_ends: tierEnds }) },
    }) as Meta;

  it('takes the tier cap, never above the product cap', () => {
    expect(endLimit(meta(1))).toBe(1);
    expect(endLimit(meta(2))).toBe(2);
    expect(endLimit(meta(5))).toBe(3);
  });

  it('is 1 when an older API does not say', () => {
    expect(endLimit(meta(undefined))).toBe(1);
  });
});

describe('createSearch outcomes', () => {
  afterEach(() => vi.unstubAllGlobals());

  const reply = (status: number, body: object) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it('maps 503 web_unavailable apart from a busy queue', async () => {
    reply(503, { reason: 'web_unavailable' });
    expect(await createSearch(buildRequest(trip, 'a'))).toEqual({ kind: 'web_unavailable' });
    reply(503, { detail: 'queue full' });
    expect(await createSearch(buildRequest(trip, 'b'))).toEqual({ kind: 'busy' });
  });

  it('maps 422 app_only apart from invalid input', async () => {
    reply(422, { reason: 'app_only', field: 'schedule' });
    expect(await createSearch(buildRequest(trip, 'a'))).toEqual({ kind: 'app_only' });
    reply(422, { detail: [] });
    expect(await createSearch(buildRequest(trip, 'b'))).toEqual({ kind: 'invalid' });
  });

  it('returns the created id', async () => {
    reply(202, { id: 'job-1' });
    expect(await createSearch(buildRequest(trip, 'a'))).toEqual({ kind: 'created', id: 'job-1' });
  });
});

describe('lookupShared', () => {
  afterEach(() => vi.unstubAllGlobals());

  const request = buildRequest(trip, 'id-1');
  const view = { id: 'job-1', status: 'done', done: 3, total: 3, eta_s: null, routes: [], updated: 1791194400 };
  const stub = (impl: () => Promise<Response>) => {
    const fetch = vi.fn(impl);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('asks for the trip anonymously, lists comma-separated, and returns a hit', async () => {
    const fetch = stub(async () => new Response(JSON.stringify(view), { status: 200 }));
    expect(await lookupShared(request)).toEqual({ kind: 'hit', view });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `${FFLY_API_BASE}/searches/shared?start=WAW&ends=VNO&cities=MAD,AMS&date_from=2026-11-01&date_to=2026-11-08&min_nights=2&max_nights=4`,
    );
    await lookupShared(buildRequest({ ...trip, ends: ['VNO', 'FCO'] }, 'id-1'));
    expect((fetch.mock.calls[1] as unknown as [string])[0]).toContain('&ends=VNO,FCO&');
    expect(init.headers ?? {}).toEqual({});
  });

  it('returns an identical search still running as a hit, to poll by its id', async () => {
    const running = { ...view, status: 'fetching', updated: null };
    stub(async () => new Response(JSON.stringify(running), { status: 200 }));
    expect(await lookupShared(request)).toEqual({ kind: 'hit', view: running });
  });

  it('is a miss on 404, 405, 422, a failed or malformed body, and on any network or CORS failure', async () => {
    for (const status of [404, 405, 422, 500]) {
      stub(async () => new Response('{}', { status }));
      expect(await lookupShared(request)).toEqual({ kind: 'miss' });
    }
    for (const body of [{ ...view, status: 'failed' }, { ...view, id: undefined }, { ...view, routes: undefined }]) {
      stub(async () => new Response(JSON.stringify(body), { status: 200 }));
      expect(await lookupShared(request)).toEqual({ kind: 'miss' });
    }
    stub(async () => new Response('not json', { status: 200 }));
    expect(await lookupShared(request)).toEqual({ kind: 'miss' });
    stub(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await lookupShared(request)).toEqual({ kind: 'miss' });
  });
});

describe('canLookup', () => {
  it('looks up only trips that start today or later', () => {
    const request = buildRequest(trip, 'id-1');
    expect(canLookup(request, '2026-10-31')).toBe(true);
    expect(canLookup(request, '2026-11-01')).toBe(true);
    expect(canLookup(request, '2026-11-02')).toBe(false);
  });
});

describe('searchedAt', () => {
  it('reads the view’s updated time as the contract’s epoch seconds', () => {
    expect(searchedAt({ updated: 1791236677.38 })?.toISOString()).toBe('2026-10-05T21:44:37.380Z');
  });
  it('is undefined when updated is absent or not a time', () => {
    expect(searchedAt({ updated: null })).toBeUndefined();
    expect(searchedAt({})).toBeUndefined();
    expect(searchedAt({ updated: Number.NaN })).toBeUndefined();
  });
});

describe('getPlaces', () => {
  afterEach(() => vi.unstubAllGlobals());

  const places = [{ code: 'WAR', name: 'Warsaw', top: true, names: { de: 'Warschau' } }];
  const stub = (response: () => Response) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => response());
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };
  const sentHeaders = (fetch: ReturnType<typeof stub>) => fetch.mock.calls[0][1]?.headers as Record<string, string>;

  it('asks conditionally on the version it holds, quoted as an ETag', async () => {
    const fetch = stub(() => new Response(null, { status: 304 }));
    expect(await getPlaces('abc')).toEqual({ kind: 'same' });
    expect(fetch.mock.calls[0][0]).toBe(`${FFLY_API_BASE}/places`);
    expect(sentHeaders(fetch)['If-None-Match']).toBe('"abc"');
    expect(Object.keys(sentHeaders(fetch))).toEqual(['If-None-Match']);
  });

  it('asks unconditionally with no version', async () => {
    const fetch = stub(() => new Response(JSON.stringify({ places }), { status: 200 }));
    await getPlaces();
    expect(sentHeaders(fetch)).not.toHaveProperty('If-None-Match');
  });

  it('returns the places and the version from the ETag', async () => {
    stub(() => new Response(JSON.stringify({ places }), { status: 200, headers: { ETag: '"v7"' } }));
    expect(await getPlaces('v6')).toEqual({ kind: 'fresh', version: 'v7', places });
  });

  it('rejects an error status or a body without places', async () => {
    stub(() => new Response('{}', { status: 404 }));
    await expect(getPlaces()).rejects.toThrow();
    stub(() => new Response('{}', { status: 200 }));
    await expect(getPlaces()).rejects.toThrow();
  });
});

describe('versionOf', () => {
  it('strips the quotes and a weak prefix, and has nothing for no ETag', () => {
    expect(versionOf('"abc"')).toBe('abc');
    expect(versionOf('W/"abc"')).toBe('abc');
    expect(versionOf(null)).toBeUndefined();
    expect(versionOf('""')).toBeUndefined();
  });
});

// The API's default channel is web, so the page sends no custom header: a GET with none is a simple CORS request,
// answered without a preflight round trip.
describe('request headers', () => {
  afterEach(() => vi.unstubAllGlobals());

  const view = { id: 'job-1', status: 'done', done: 3, total: 3, eta_s: null, routes: [] };
  const sent = async (call: () => Promise<unknown>, body: object = view, status = 200) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(status === 304 ? null : JSON.stringify(body), { status }));
    vi.stubGlobal('fetch', fetch);
    await call();
    return new Headers(fetch.mock.calls[0][1]?.headers);
  };
  const names = (headers: Headers) => [...headers.keys()];

  it('sends no header on GET /meta, /searches/{id} and /searches/shared', async () => {
    expect(names(await sent(getMeta))).toEqual([]);
    expect(names(await sent(() => getSearch('job-1')))).toEqual([]);
    expect(names(await sent(() => lookupShared(buildRequest(trip, 'a'))))).toEqual([]);
  });

  it('asks /meta without the place list, and with no header', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await getMeta();
    expect(fetch.mock.calls[0][0]).toBe(`${FFLY_API_BASE}/meta?places=false`);
    expect(names(new Headers(fetch.mock.calls[0][1]?.headers))).toEqual([]);
  });

  it('sends only If-None-Match on GET /places, and nothing without a version', async () => {
    const places = { places: [] };
    expect(names(await sent(() => getPlaces('v1'), places, 304))).toEqual(['if-none-match']);
    expect(names(await sent(() => getPlaces(), places))).toEqual([]);
  });

  it('sends only the JSON content type on POST /searches, never X-Platform or X-Client-Id', async () => {
    const headers = await sent(() => createSearch(buildRequest(trip, 'a')), { id: 'job-1' }, 202);
    expect(names(headers)).toEqual(['content-type']);
    expect(headers.get('content-type')).toBe('application/json');
  });
});
