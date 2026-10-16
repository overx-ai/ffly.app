import { beforeAll, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en';
import { DICTIONARIES, LANGS, editionOf, useLang, type Dict } from '../src/i18n';
import { overlay } from '../src/i18n/edition';
import { fill, plural, type Plural } from '../src/i18n/text';
import { APP_CLAIM, stringsOf } from '../scripts/copy-rules.mjs';

const ORIGIN = 'https://ffly.app';

let site: typeof import('../src/site-pages');
beforeAll(async () => {
  vi.stubEnv('SITE', ORIGIN);
  site = await import('../src/site-pages');
});

describe('pathFor and urlFor', () => {
  it('keeps English at the root and prefixes the other languages, never with a trailing slash', () => {
    expect(site.pathFor('')).toBe('/');
    expect(site.pathFor('search')).toBe('/search');
    expect(site.pathFor('', 'de')).toBe('/de');
    expect(site.pathFor('search', 'de')).toBe('/de/search');
    expect(site.pathFor('guides', 'pt')).toBe('/pt/guides');
    expect(site.urlFor('', 'pl')).toBe(`${ORIGIN}/pl`);
    expect(site.urlFor('')).toBe(`${ORIGIN}/`);
  });

  it('resolves English-only pages to the root in every language', () => {
    for (const slug of ['support', 'privacy', 'terms', 'guides/cheapest-order-to-visit-cities'] as const) {
      expect(site.pathFor(slug, 'fr')).toBe(`/${slug}`);
      expect(site.hreflangOf(slug, 'fr')).toBe('en');
      expect(site.hreflangOf(slug)).toBeUndefined();
    }
    expect(site.hreflangOf('search', 'fr')).toBeUndefined();
  });
});

describe('alternates', () => {
  it('lists every language plus x-default, pointing at the English root URL', () => {
    const links = site.alternates('search');
    expect(links.map((l) => l.hreflang)).toEqual(['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt-PT', 'ru', 'sv', 'da', 'nb', 'fi', 'x-default']);
    expect(links.find((l) => l.hreflang === 'pt-PT')?.href).toBe(`${ORIGIN}/pt/search`);
    expect(links.find((l) => l.hreflang === 'nb')?.href).toBe(`${ORIGIN}/no/search`);
    expect(links.at(-1)?.href).toBe(`${ORIGIN}/search`);
    expect(site.alternates('').at(-1)?.href).toBe(`${ORIGIN}/`);
  });

  it('is empty for English-only pages', () => {
    expect(site.alternates('privacy')).toEqual([]);
    expect(site.alternates('guides/multi-city-vs-one-way-tickets')).toEqual([]);
  });
});

describe('plural', () => {
  const forms = { one: '{n} miasto', few: '{n} miasta', many: '{n} miast', other: '{n} miasta' };

  it('picks the Polish one, few and many forms', () => {
    expect(plural('pl', forms, 1)).toBe('1 miasto');
    expect(plural('pl', forms, 2)).toBe('2 miasta');
    expect(plural('pl', forms, 5)).toBe('5 miast');
    expect(plural('pl', forms, 22)).toBe('22 miasta');
  });

  it('falls back to other when a form is missing', () => {
    expect(plural('pl', { other: '{n} x' }, 5)).toBe('5 x');
    expect(plural('en-GB', en.widget.script.messages.found, 1)).toBe('1 route found');
    expect(plural('en-GB', en.widget.script.messages.found, 3)).toBe('3 routes found');
  });
});

describe('fill', () => {
  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(fill('Book {from} to {to}', { from: 'Rome', to: 'Madrid' })).toBe('Book Rome to Madrid');
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });
});

describe('dictionaries', () => {
  const shape = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(shape)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).filter(([k]) => !['one', 'two', 'few', 'many', 'zero'].includes(k)).map(([k, v]) => [k, shape(v)]))
        : typeof value;

  // Against English's served edition: v2 swaps the rotation's plural tip for a plain one.
  it('give every language the keys of English', () => {
    const english = shape(useLang('en').t);
    for (const { code } of LANGS) expect(shape(useLang(code).t), code).toEqual(english);
  });

  it('label a city with several airports in every language', () => {
    for (const { code } of LANGS) expect(useLang(code).t.widget.script.allAirports, code).toMatch(/\S/);
  });

  it('format per locale', () => {
    expect(useLang('en').fmt.money(129.62, 'EUR')).toBe('€129.62');
    expect(useLang('de').fmt.money(129.62, 'EUR')).toMatch(/^129,62\s€$/);
  });
});

describe('fill and abbreviations', () => {
  it('does not double a full stop after a value that already ends in one', () => {
    expect(fill('{from} bis {to}.', { from: 'So., 15. Nov.', to: 'So., 22. Nov.' })).toBe('So., 15. Nov. bis So., 22. Nov.');
    expect(fill('{to}.', { to: '22 Nov' })).toBe('22 Nov.');
  });
});

describe('editions (spec 016)', () => {
  // The 1.0 lines v2 must rewrite: each says the app is cheaper, goes first or has more.
  const claims = (d: Dict) => {
    const { nudges, messages } = d.widget.script;
    return [nudges.priceLine, nudges.queue, nudges.cityCap, nudges.appHint, nudges.rotation, messages.more, messages.lockedRow, d.search.lead, d.home.plans.title];
  };

  it('replace a plural or a list whole, never form by form', () => {
    const forms: Plural = { one: '{n} city', few: '{n} cities (few)', other: '{n} cities' };
    const base = { n: forms, list: ['a', 'b'], keep: { a: 'old', b: 'kept' } };
    expect(overlay(base, { n: { other: 'any' }, list: ['c'], keep: { a: 'new' } })).toEqual({ n: { other: 'any' }, list: ['c'], keep: { a: 'new', b: 'kept' } });
  });

  it('give every language v2 copy for each 1.0 app claim', () => {
    for (const { code } of LANGS) {
      const dict = DICTIONARIES[code];
      const v2 = claims(editionOf(dict, true));
      claims(dict).forEach((line, i) => expect(JSON.stringify(v2[i]), `${code} claim ${i}`).not.toBe(JSON.stringify(line)));
    }
  });

  it('make no app-cheaper or app-queue claim in English v2', () => {
    const { v2: _, ...copy } = editionOf(en, true);
    const claim = stringsOf(copy).find((text: string) => APP_CLAIM.test(text));
    expect(claim).toBeUndefined();
  });

  it('give Russian and Polish every plural form of the window in both editions, counted wherever more than one number takes it', () => {
    for (const code of ['ru', 'pl'] as const) for (const { home, widget } of [DICTIONARIES[code], editionOf(DICTIONARIES[code], true)]) {
      for (const forms of [widget.script.messages.quotaWindow, home.faq.free.web, home.faq.free.every]) {
        expect(Object.keys(forms).sort(), code).toEqual(['few', 'many', 'one', 'other']);
        // Russian "one" is 1, 21, 31...; Polish "one" is 1 alone.
        const counted = Object.entries(forms).filter(([form]) => code === 'ru' || form !== 'one');
        for (const [form, text] of counted) expect(text, `${code} ${form}`).toContain('{n}');
      }
    }
  });
});
