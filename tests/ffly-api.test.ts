import { afterEach, describe, expect, it, vi } from 'vitest';
import { FFLY_API_BASE } from '../src/app';
import { buildRequest, canLookup, createSearch, endLimit, lookupShared, searchedAt, type Meta } from '../src/scripts/ffly-api';

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
    expect(init.headers).toEqual({ 'X-Platform': 'web' });
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
