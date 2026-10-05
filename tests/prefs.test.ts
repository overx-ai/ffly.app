import { describe, expect, it } from 'vitest';
import { PREFS } from '../src/app';
import { clearCookie, cookieString, fillPrefs, parseCookies, savedCookies } from '../src/scripts/prefs';

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
    const cookies = savedCookies({ start: 'WAW', end: 'VNO', cities: ['MAD', 'AMS'] });
    expect(cookies).toEqual([cookieString(PREFS.from, 'WAW'), cookieString(PREFS.back, 'VNO'), cookieString(PREFS.cities, 'MAD,AMS')]);
    expect(cookies.join(';')).not.toMatch(/20\d\d-/);
    expect(savedCookies({ start: 'WAW', end: 'WAW', cities: ['MAD'] })[1]).toBe(clearCookie(PREFS.back));
  });
});

describe('fillPrefs', () => {
  const cookies = parseCookies('ffly_from=VNO; ffly_back=WAW; ffly_cities=FCO');

  it('takes the query string first, then cookies, then defaults', () => {
    const filled = fillPrefs(new URLSearchParams('from=waw&cities=MAD,AMS'), cookies, isPlace);
    expect(filled.from).toEqual({ value: 'WAW', source: 'query' });
    expect(filled.cities).toEqual({ value: ['MAD', 'AMS'], source: 'query' });
    expect(filled.back).toEqual({ value: 'WAW', source: 'cookie' });

    const empty = fillPrefs(new URLSearchParams(), new Map(), isPlace);
    expect(empty).toEqual({
      from: { value: undefined, source: 'default' },
      back: { value: undefined, source: 'default' },
      cities: { value: [], source: 'default' },
    });
  });

  it('ignores unknown codes and falls through to the next source', () => {
    const filled = fillPrefs(new URLSearchParams('from=XXX&cities=ZZZ,MAD'), cookies, isPlace);
    expect(filled.from).toEqual({ value: 'VNO', source: 'cookie' });
    expect(filled.cities).toEqual({ value: ['MAD'], source: 'query' });
  });
});
