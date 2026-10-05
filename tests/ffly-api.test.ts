import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, createSearch } from '../src/scripts/ffly-api';

const trip = {
  start: 'WAW',
  end: 'VNO',
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
