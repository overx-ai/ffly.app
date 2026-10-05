import { describe, expect, it } from 'vitest';
import { PREFS } from '../src/app';
import type { SearchRequest } from '../src/scripts/ffly-api';
import {
  clearCookie,
  cookieString,
  fillPrefs,
  finishOf,
  parseCookies,
  sameSearch,
  savedCookies,
  shareQuery,
  sharedRequest,
  shareUrl,
} from '../src/scripts/prefs';

const known = new Set(['WAW', 'VNO', 'MAD', 'AMS', 'FCO']);
const isPlace = (code: string) => known.has(code);

describe('cookies', () => {
  it('writes a first-party functional cookie with its lifetime', () => {
    expect(cookieString(PREFS.from, 'WAW')).toBe(`ffly_from=WAW; Max-Age=${365 * 86400}; Path=/; SameSite=Lax; Secure`);
    expect(cookieString(PREFS.cities, 'MAD,AMS')).toBe(`ffly_cities=MAD%2CAMS; Max-Age=${30 * 86400}; Path=/; SameSite=Lax; Secure`);
    expect(clearCookie(PREFS.back)).toBe('ffly_back=; Max-Age=0; Path=/; SameSite=Lax; Secure');
  });

  it('parses document.cookie', () => {
    expect(parseCookies('a=1; ffly_cities=MAD%2CAMS;  junk; b=')).toEqual(
      new Map([['a', '1'], ['ffly_cities', 'MAD,AMS'], ['b', '']]),
    );
  });

  it('stores the places of a trip and never its dates', () => {
    const cookies = savedCookies({ start: 'WAW', ends: ['VNO'], cities: ['MAD', 'AMS'] });
    expect(cookies).toEqual([cookieString(PREFS.from, 'WAW'), cookieString(PREFS.back, 'VNO'), cookieString(PREFS.cities, 'MAD,AMS')]);
    expect(cookies.join(';')).not.toMatch(/20\d\d-/);
    expect(savedCookies({ start: 'WAW', ends: ['WAW'], cities: ['MAD'] })[1]).toBe(clearCookie(PREFS.back));
    expect(savedCookies({ start: 'WAW', ends: [], cities: ['MAD'] })[1]).toBe(clearCookie(PREFS.back));
  });

  it('stores several places to finish as one list', () => {
    expect(savedCookies({ start: 'WAW', ends: ['VNO', 'FCO'], cities: ['MAD'] })[1]).toBe(cookieString(PREFS.back, 'VNO,FCO'));
  });
});

describe('fillPrefs', () => {
  const cookies = parseCookies('ffly_from=VNO; ffly_back=WAW; ffly_cities=FCO');

  it('takes the query string first, then cookies, then defaults', () => {
    const filled = fillPrefs(new URLSearchParams('from=waw&cities=MAD,AMS'), cookies, isPlace);
    expect(filled.from).toEqual({ value: 'WAW', source: 'query' });
    expect(filled.cities).toEqual({ value: ['MAD', 'AMS'], source: 'query' });
    expect(filled.back).toEqual({ value: ['WAW'], source: 'cookie' });

    const empty = fillPrefs(new URLSearchParams(), new Map(), isPlace);
    expect(empty).toEqual({
      from: { value: undefined, source: 'default' },
      back: { value: [], source: 'default' },
      cities: { value: [], source: 'default' },
      dates: { value: undefined, source: 'default' },
      nights: { value: undefined, source: 'default' },
    });
  });

  it('ignores unknown codes and falls through to the next source', () => {
    const filled = fillPrefs(new URLSearchParams('from=XXX&cities=ZZZ,MAD'), cookies, isPlace);
    expect(filled.from).toEqual({ value: 'VNO', source: 'cookie' });
    expect(filled.cities).toEqual({ value: ['MAD'], source: 'query' });
  });

  it('reads one or several places to finish, in order, without unknown codes or repeats', () => {
    const back = (query: string, cookie = '') => fillPrefs(new URLSearchParams(query), parseCookies(cookie), isPlace).back;
    expect(back('back=WAW')).toEqual({ value: ['WAW'], source: 'query' });
    expect(back('back=vno,WAW')).toEqual({ value: ['VNO', 'WAW'], source: 'query' });
    expect(back('back=XXX,VNO,VNO,FCO')).toEqual({ value: ['VNO', 'FCO'], source: 'query' });
    expect(back('back=XXX', 'ffly_back=FCO%2CWAW')).toEqual({ value: ['FCO', 'WAW'], source: 'cookie' });
  });
});

describe('fillPrefs dates and nights', () => {
  const limits = { maxNights: 7, maxWindowDays: 30 };
  const read = (query: string) => fillPrefs(new URLSearchParams(query), new Map(), isPlace, limits);

  it('reads dates=from..to and nights=min-max from the query only', () => {
    const filled = read('dates=2026-11-01..2026-11-08&nights=2-4');
    expect(filled.dates).toEqual({ value: { from: '2026-11-01', to: '2026-11-08' }, source: 'query' });
    expect(filled.nights).toEqual({ value: { min: 2, max: 4 }, source: 'query' });
  });

  it('falls back to defaults on anything invalid', () => {
    for (const dates of ['2026-11-08..2026-11-01', '2026-11-01..2026-11-01', '2026-02-30..2026-03-02', '2026-11-01', 'x..y', '2026-11-01..2026-12-15']) {
      expect(read(`dates=${dates}`).dates).toEqual({ value: undefined, source: 'default' });
    }
    for (const nights of ['5-2', '0-3', '2-8', '2', 'a-b', '2-4-6', '-1-2']) {
      expect(read(`nights=${nights}`).nights).toEqual({ value: undefined, source: 'default' });
    }
  });
});

describe('share links', () => {
  const request: SearchRequest = {
    start: 'WAW',
    ends: ['VNO'],
    cities: ['MAD', 'AMS'],
    date_from: '2026-11-01',
    date_to: '2026-11-08',
    min_nights: 2,
    max_nights: 4,
    client_request_id: 'id-1',
  };
  const roundTrip = { ...request, ends: ['WAW'] };
  const twoEnds = { ...request, ends: ['VNO', 'FCO'] };
  const startAmongEnds = { ...request, ends: ['WAW', 'VNO'] };

  it('writes every parameter, cities comma-separated, and omits back when it is the start', () => {
    expect(shareQuery(request)).toBe('from=WAW&back=VNO&cities=MAD,AMS&dates=2026-11-01..2026-11-08&nights=2-4');
    expect(shareQuery(roundTrip)).toBe('from=WAW&cities=MAD,AMS&dates=2026-11-01..2026-11-08&nights=2-4');
    expect(shareQuery({ ...request, ends: [] })).toBe(shareQuery(roundTrip));
  });

  it('writes several places to finish comma-separated, in order', () => {
    expect(shareQuery(twoEnds)).toBe('from=WAW&back=VNO,FCO&cities=MAD,AMS&dates=2026-11-01..2026-11-08&nights=2-4');
    expect(shareQuery(startAmongEnds)).toContain('&back=WAW,VNO&');
  });

  it('names the finish only when it is more than the start', () => {
    expect(finishOf(request)).toEqual(['VNO']);
    expect(finishOf(roundTrip)).toEqual([]);
    expect(finishOf({ ...request, ends: [] })).toEqual([]);
    expect(finishOf(startAmongEnds)).toEqual(['WAW', 'VNO']);
  });

  it('builds the URL on the current path and keeps the hash', () => {
    expect(shareUrl('/de', request, '#search')).toBe('/de?from=WAW&back=VNO&cities=MAD,AMS&dates=2026-11-01..2026-11-08&nights=2-4#search');
    expect(shareUrl('/search', roundTrip)).toBe('/search?from=WAW&cities=MAD,AMS&dates=2026-11-01..2026-11-08&nights=2-4');
  });

  it('round-trips through fillPrefs into the same search', () => {
    for (const r of [request, roundTrip, twoEnds, startAmongEnds]) {
      const prefs = fillPrefs(new URLSearchParams(shareQuery(r)), parseCookies('ffly_back=FCO'), isPlace);
      const shared = sharedRequest(prefs, 'id-2');
      expect(shared).toEqual({ ...r, client_request_id: 'id-2' });
      expect(sameSearch(shared!, r)).toBe(true);
    }
  });

  it('is a shared search only when places, dates and nights all come from the query', () => {
    const cookies = parseCookies('ffly_from=WAW; ffly_cities=MAD');
    const prefs = (query: string) => fillPrefs(new URLSearchParams(query), cookies, isPlace);
    expect(sharedRequest(prefs('dates=2026-11-01..2026-11-08&nights=2-4'), 'x')).toBeUndefined();
    expect(sharedRequest(prefs('from=WAW&cities=MAD&nights=2-4'), 'x')).toBeUndefined();
    expect(sharedRequest(prefs('from=WAW&cities=MAD&dates=2026-11-01..2026-11-08'), 'x')).toBeUndefined();
    expect(sharedRequest(prefs('from=WAW&cities=MAD&dates=2026-11-01..2026-11-08&nights=2-4'), 'x')).toBeDefined();
  });

  it('tells different searches apart', () => {
    expect(sameSearch(request, { ...request, client_request_id: 'other' })).toBe(true);
    expect(sameSearch(request, { ...request, max_nights: 5 })).toBe(false);
    expect(sameSearch(request, roundTrip)).toBe(false);
    expect(sameSearch(twoEnds, { ...twoEnds, ends: ['FCO', 'VNO'] })).toBe(false);
    expect(sameSearch(twoEnds, request)).toBe(false);
  });
});
