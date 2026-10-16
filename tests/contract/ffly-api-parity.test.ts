// Consumer contract for the web search's request options (spec 015, docs/PINS.md): the request each control builds is
// held to the API's pinned SearchRequest schema, its caps are the schema's, and today's /meta gates every 1.12.0 field.
import { describe, expect, it } from 'vitest';
import { REQUEST_LIMITS } from '../../src/app';
import { API_HOURS, OPTION_FIELDS, allowedFields, buildRequest, type Meta, type Trip, type TripOptions } from '../../src/scripts/ffly-api';
import { tripLists } from '../../src/scripts/filters';
import { fillPrefs, sharedRequest, shareQuery } from '../../src/scripts/prefs';
import meta111 from '../fixtures/ffly-api-1.12/meta-web-1.11.json';
import meta112 from '../fixtures/ffly-api-1.12/meta-free.json';
import pinned from '../fixtures/ffly-api-1.12/search-request.schema.json';
import { schemaProblems, type Schema } from './json-schema';

const schemas = pinned.schemas as Record<string, Schema>;
const problems = schemaProblems(schemas);

const every: Required<TripOptions> = {
  optional: ['AMS'],
  excluded: [{ source: 'src', origin: 'WMI', dest: 'MAD', day: '2026-11-02', dep: '06:10' }],
  pinned: [{ city: 'MAD', date_from: '2026-11-03', date_to: '2026-11-04' }],
  max_stops_per_leg: 0,
  max_stops_total: 2,
  schedule: { short_from: '07:00', short_to: '21:45' },
  airports: { WAW: ['WMI'] },
  priority: 'price',
  travellers: { adults: 2, children: 1, infants: 1 },
};
const trip: Trip = { start: 'WAW', ends: ['WAW'], cities: ['MAD', 'AMS'], dateFrom: '2026-11-01', dateTo: '2026-11-10', minNights: 2, maxNights: 4, options: every };
const request = (allowed: Set<(typeof OPTION_FIELDS)[number]>, t = trip) => buildRequest(t, '6f1c2a5e-0b8e-4e4f-9d43-5b2a1a7f0c11', allowed);

describe('REQUEST_LIMITS', () => {
  it('equals the caps of the pinned SearchRequest schema', () => {
    const p = schemas.SearchRequest.properties!;
    const stops = (key: string) => p[key].anyOf!.find((option) => option.type === 'integer')!.maximum;
    expect(REQUEST_LIMITS.pins).toBe(p.pinned.maxItems);
    expect(REQUEST_LIMITS.excluded).toBe(p.excluded.maxItems);
    expect(REQUEST_LIMITS.stopsPerLeg).toBe(stops('max_stops_per_leg'));
    expect(REQUEST_LIMITS.stopsTotal).toBe(stops('max_stops_total'));
    expect(REQUEST_LIMITS.minAdults).toBe(schemas.Travellers.properties!.adults.minimum);
    expect(REQUEST_LIMITS.seated).toBe(schemas.Travellers.properties!.adults.maximum);
    expect(REQUEST_LIMITS.sourceLength).toBe(schemas.ExcludedFlight.properties!.source.maxLength);
  });

  it('shows the schema defaults as the flight hours until the visitor picks some, so those are never sent', () => {
    const hours = schemas.Schedule.properties!;
    expect(API_HOURS).toEqual({ short_from: hours.short_from.default, short_to: hours.short_to.default });
  });
});

describe('buildRequest against the pinned schema', () => {
  it('emits every option in the schema shape', () => {
    const full = request(new Set(OPTION_FIELDS));
    expect(Object.keys(full)).toEqual(expect.arrayContaining([...OPTION_FIELDS]));
    expect(problems(full, schemas.SearchRequest)).toEqual([]);
    expect(problems({ ...full, schedule: { short_from: '7:00', short_to: '21:45' }, stops: 1 }, schemas.SearchRequest)).toHaveLength(2);
  });

  it('builds one-way and round trips the schema takes (1.10.0)', () => {
    for (const type of ['oneway', 'round'] as const) {
      const lists = tripLists(type, 'WAW', 'MAD');
      expect(problems(request(new Set(), { ...trip, ...lists, options: {} }), schemas.SearchRequest)).toEqual([]);
    }
    expect(tripLists('oneway', 'WAW', 'MAD')).toEqual({ ends: ['MAD'], cities: [] });
    expect(tripLists('round', 'WAW', 'MAD')).toEqual({ ends: ['WAW'], cities: ['MAD'] });
  });
});

describe('the gate, per /meta', () => {
  it('lets only travellers through to the live 1.11 web channel, flag on or off', () => {
    for (const v12 of [false, true]) {
      const allowed = allowedFields(meta111 as Meta, v12);
      const sent = request(allowed);
      expect(Object.keys(sent).filter((key) => (OPTION_FIELDS as readonly string[]).includes(key))).toEqual(['travellers']);
      for (const field of (meta111 as Meta).tier_limits.app_only_fields!) expect(sent).not.toHaveProperty(field);
    }
  });

  it('lets every option through to 1.12.0 with CONTRACT_1_12, and each round-trips through a shared link', () => {
    const allowed = allowedFields(meta112 as Meta, true);
    expect([...allowed].sort()).toEqual([...OPTION_FIELDS].sort());
    const sent = request(allowed);
    const airports: Record<string, string[]> = { WAW: ['WAW', 'WMI'] };
    const prefs = fillPrefs(new URLSearchParams(shareQuery(sent)), new Map(), () => true, undefined, (city) => airports[city] ?? []);
    const { excluded: _, ...linked } = sent;
    expect(sharedRequest(prefs, sent.client_request_id)).toEqual(linked);
  });
});
