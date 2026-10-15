import { describe, expect, it } from 'vitest';
import {
  flightOf,
  landingChoices,
  pinIssue,
  stepConnections,
  stepTravellers,
  takeoffChoices,
  toggleAirport,
  tripTypeOf,
} from '../src/scripts/filters';

const one = { adults: 1, children: 0, infants: 0 };

describe('tripTypeOf', () => {
  it('reads a request as the app does', () => {
    expect(tripTypeOf({ start: 'WAW', ends: ['ROM'], cities: [] })).toBe('oneway');
    expect(tripTypeOf({ start: 'WAW', ends: ['WAW'], cities: ['ROM'] })).toBe('round');
    expect(tripTypeOf({ start: 'WAW', ends: ['WAW'], cities: ['ROM'], optional: ['ROM'] })).toBe('multi');
    expect(tripTypeOf({ start: 'WAW', ends: ['VNO'], cities: ['ROM'] })).toBe('multi');
  });
});

describe('travellers', () => {
  it('seat adults and children together, an infant per adult, and take infants down with the adults', () => {
    expect(stepTravellers(one, 'adults', -1)).toEqual(one);
    expect(stepTravellers(one, 'infants', 1)).toEqual({ ...one, infants: 1 });
    expect(stepTravellers({ ...one, infants: 1 }, 'infants', 1)).toEqual({ ...one, infants: 1 });
    expect(stepTravellers({ adults: 2, children: 7, infants: 2 }, 'children', 1)).toEqual({ adults: 2, children: 7, infants: 2 });
    expect(stepTravellers({ adults: 2, children: 0, infants: 2 }, 'adults', -1)).toEqual({ adults: 1, children: 0, infants: 1 });
  });
});

describe('stepConnections', () => {
  it('goes Any, then the contract maximum down to none, and back up to Any', () => {
    expect(stepConnections(undefined, false)).toBe(6);
    expect(stepConnections(0, false)).toBe(0);
    expect(stepConnections(6, true)).toBeUndefined();
    expect(stepConnections(undefined, true)).toBeUndefined();
  });
});

describe('pinIssue', () => {
  const request = { cities: ['MAD', 'AMS'], date_from: '2026-11-01', date_to: '2026-11-10', max_nights: 3 };

  it('takes pins strictly inside the window, no longer than the nights, never overlapping', () => {
    expect(pinIssue({ ...request, pinned: [{ city: 'MAD', date_from: '2026-11-02', date_to: '2026-11-03' }] })).toBeUndefined();
    expect(pinIssue({ ...request, pinned: [{ city: 'MAD', date_from: '2026-11-01' }] })).toEqual({ kind: 'outsideWindow', city: 'MAD' });
    expect(pinIssue({ ...request, pinned: [{ city: 'MAD', date_from: '2026-11-02', date_to: '2026-11-05' }] })).toEqual({ kind: 'tooLong', city: 'MAD' });
    expect(
      pinIssue({ ...request, pinned: [{ city: 'AMS', date_from: '2026-11-03' }, { city: 'MAD', date_from: '2026-11-02', date_to: '2026-11-03' }] }),
    ).toEqual({ kind: 'overlap', city: 'MAD', other: 'AMS' });
  });
});

describe('toggleAirport', () => {
  const all = ['LHR', 'LGW', 'STN'];

  it('keeps the last chosen airport, and all chosen is no choice', () => {
    const stanstedOnly = toggleAirport(toggleAirport({}, 'LON', 'LHR', all), 'LON', 'LGW', all);
    expect(stanstedOnly).toEqual({ LON: ['STN'] });
    expect(toggleAirport(stanstedOnly, 'LON', 'STN', all)).toBe(stanstedOnly);
    expect(toggleAirport({ LON: ['LHR', 'LGW'] }, 'LON', 'STN', all)).toEqual({});
  });
});

describe('flightOf', () => {
  it('names a full leg by its own fields, and nothing without them', () => {
    const leg = { from_place: 'WAW', to_place: 'MAD', stops: 0, source: 's', origin: 'WMI', dest: 'MAD', day: '2026-11-02', dep: '6:10' };
    expect(flightOf(leg)).toEqual({ source: 's', origin: 'WMI', dest: 'MAD', day: '2026-11-02', dep: '' });
    expect(flightOf({ ...leg, source: null })).toBeUndefined();
    expect(flightOf({ ...leg, source: 'x'.repeat(33) })).toBeUndefined();
  });
});

describe('flight hours', () => {
  it('offer takeoffs before the landing and landings after the takeoff, in quarter hours', () => {
    expect(takeoffChoices('01:00')).toEqual(['00:00', '00:15', '00:30', '00:45']);
    expect(landingChoices('23:00')).toEqual(['23:15', '23:30', '23:45']);
  });
});
