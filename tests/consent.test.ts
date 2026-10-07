import { describe, expect, it } from 'vitest';
import { CONSENT } from '../src/app';
import {
  analyticsCookies,
  choiceCookie,
  expiryCookies,
  initialChoice,
  mustReload,
  readChoice,
  shouldShowBanner,
} from '../src/scripts/consent-state';

// Enough of document.cookie for these tests: a cookie is keyed by name, domain and path, and Max-Age=0 deletes it.
class CookieJar {
  private cookies = new Map<string, string>();

  constructor(private host: string) {}

  set(line: string) {
    const [pair, ...attributes] = line.split(';').map((part) => part.trim());
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    const attr = new Map(attributes.map((a) => [a.split('=')[0].toLowerCase(), a.split('=')[1] ?? '']));
    const domain = attr.get('domain')?.replace(/^\./, '') ?? this.host;
    if (!`.${this.host}`.endsWith(`.${domain}`)) return;
    const key = `${name}|${attr.has('domain') ? `.${domain}` : domain}|${attr.get('path') ?? '/'}`;
    if (attr.get('max-age') === '0') this.cookies.delete(key);
    else this.cookies.set(key, `${name}=${pair.slice(eq + 1)}`);
  }

  get header() {
    return [...this.cookies.values()].join('; ');
  }
}

describe('choice cookie', () => {
  it('stores the choice for every page, for six months', () => {
    expect(choiceCookie('granted')).toBe(`${CONSENT.cookie}=granted; Max-Age=${182 * 86400}; Path=/; SameSite=Lax; Secure`);
    expect(choiceCookie('denied')).toMatch(/^ffly_consent=denied; .*Path=\//);
  });

  it('reads back what it wrote and ignores anything else', () => {
    const jar = new CookieJar('ffly.app');
    expect(readChoice(jar.header)).toBeUndefined();
    jar.set(choiceCookie('denied'));
    expect(readChoice(jar.header)).toBe('denied');
    jar.set(choiceCookie('granted'));
    expect(readChoice(jar.header)).toBe('granted');
    expect(readChoice('ffly_consent=maybe')).toBeUndefined();
  });
});

describe('banner', () => {
  it('shows only while analytics is configured and no choice is stored', () => {
    expect(shouldShowBanner('G-TEST', undefined)).toBe(true);
    expect(shouldShowBanner('G-TEST', 'granted')).toBe(false);
    expect(shouldShowBanner('G-TEST', 'denied')).toBe(false);
    expect(shouldShowBanner(undefined, undefined)).toBe(false);
  });

  it('reloads only when consent is withdrawn, so a loaded gtag stops', () => {
    expect(mustReload('granted', 'denied')).toBe(true);
    expect(mustReload(undefined, 'denied')).toBe(false);
    expect(mustReload('denied', 'granted')).toBe(false);
    expect(mustReload('granted', 'granted')).toBe(false);
  });
});

describe('withdrawal', () => {
  it('finds the analytics cookies and nothing else', () => {
    expect(analyticsCookies('_ga=GA1.1.1; _ga_JYLD2DWSJG=GS1; _gat=1; _gallery=x; ffly_from=WAW; ffly_consent=granted')).toEqual([
      '_ga',
      '_ga_JYLD2DWSJG',
    ]);
  });

  it('expires the host-only form and every parent domain but the TLD', () => {
    expect(expiryCookies(['_ga'], 'www.ffly.app')).toEqual([
      '_ga=; Max-Age=0; Path=/',
      '_ga=; Max-Age=0; Path=/; Domain=.www.ffly.app',
      '_ga=; Max-Age=0; Path=/; Domain=.ffly.app',
    ]);
    expect(expiryCookies(['_ga'], 'localhost')).toEqual(['_ga=; Max-Age=0; Path=/']);
  });

  it('deletes cookies set on the parent domain and on the host, and keeps the rest', () => {
    const jar = new CookieJar('www.ffly.app');
    jar.set('_ga=GA1.1.1; Path=/; Domain=.ffly.app; Max-Age=1000');
    jar.set('_ga_JYLD2DWSJG=GS1; Path=/; Domain=.ffly.app; Max-Age=1000');
    jar.set('_ga=GA1.1.2; Path=/');
    jar.set('ffly_from=WAW; Path=/');
    jar.set(choiceCookie('denied'));
    for (const line of expiryCookies(analyticsCookies(jar.header), 'www.ffly.app')) jar.set(line);
    expect(analyticsCookies(jar.header)).toEqual([]);
    expect(jar.header).toBe('ffly_from=WAW; ffly_consent=denied');
  });
});

describe('Global Privacy Control', () => {
  it('counts as Reject until the visitor chooses', () => {
    expect(initialChoice(undefined, true)).toBe('denied');
    expect(shouldShowBanner('G-TEST', initialChoice(undefined, true))).toBe(false);
  });

  it('never overrides a stored choice, and is nothing without the signal', () => {
    expect(initialChoice('granted', true)).toBe('granted');
    expect(initialChoice(undefined, false)).toBeUndefined();
  });
});
