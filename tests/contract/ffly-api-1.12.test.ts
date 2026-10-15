// Consumer contract for ffly API 1.12.0 (1B-bots spec 574, docs/PINS.md): its answers, as fixtures, parsed through the
// site's own types and mapping. A change to the pinned shape fails here before it reaches the page.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FFLY_API_BASE } from '../../src/app';
import { endLimit, getTripKit, type Meta, type SearchView, type TripKitOffer } from '../../src/scripts/ffly-api';
import { kitGroups, routeRows } from '../../src/scripts/results';
import metaFree from '../fixtures/ffly-api-1.12/meta-free.json';
import metaPro from '../fixtures/ffly-api-1.12/meta-pro.json';
import searchFree from '../fixtures/ffly-api-1.12/search-free.json';
import searchPro from '../fixtures/ffly-api-1.12/search-pro.json';
import tripKit from '../fixtures/ffly-api-1.12/trip-kit.json';

const names: Record<string, string> = { WAW: 'Warsaw', BCN: 'Barcelona', ROM: 'Rome' };
const format = { name: (code: string) => names[code] ?? code, money: (n: number) => `€${n}`, day: (iso: string) => iso.slice(5) };
const SELLERS = ['Aviasales', 'Trip.com', 'Agoda', 'Welcome Pickups', 'Yesim', 'EKTA'];

describe('/meta tier_limits', () => {
  it('gives Pro and Free their caps and tier from the answer, never from the site', () => {
    for (const [fixture, tier, cities, ends] of [[metaPro, 'pro', 8, 3], [metaFree, 'free', 4, 2]] as const) {
      const meta = fixture as Meta;
      expect(meta.tier).toBe(tier);
      expect(Math.min(meta.tier_limits.max_cities, meta.limits.max_cities)).toBe(cities);
      expect(endLimit(meta)).toBe(ends);
    }
    expect((metaPro as Meta).free_searches_left).toBeNull();
  });
});

describe('a Free search view', () => {
  const view = searchFree as SearchView;
  const [row] = routeRows(view, format, true).rows;

  it('books each leg via its partner offer, the same link as leg.link', () => {
    for (const [i, leg] of row.legs.entries()) {
      expect(leg.book).toEqual([{ kind: 'partner', url: view.routes[0].legs![i].link }]);
    }
  });

  it('carries the Pro preview saving and the Trip kit in a fixed order of kinds', () => {
    expect(row.proSaving).toBe(30.8);
    expect(row.kit.map((group) => group.kind)).toEqual(['hotel', 'esim', 'insurance', 'transfer']);
    expect(row.kit[0].links.map((link) => link.text)).toEqual(['Barcelona · 11-02 – 11-05', 'Rome · 11-05 – 11-09']);
    expect(row.kit[3].links[0].text).toBe('Barcelona');
  });

  it('names no seller anywhere in what it renders', () => {
    const shown = JSON.stringify(row);
    for (const seller of SELLERS) expect(shown).not.toContain(seller);
  });

  it('renders as 1.11 while CONTRACT_1_12 is off', () => {
    const [plain] = routeRows(view, format, false).rows;
    expect(plain.legs[0].book).toEqual([{ kind: 'link', url: view.routes[0].legs![0].link }]);
    expect(plain.proSaving).toBeUndefined();
    expect(plain.kit).toEqual([]);
  });
});

describe('a Pro search view', () => {
  it('offers Book direct, then via partner, in the API order, and no teaser', () => {
    const [row] = routeRows(searchPro as SearchView, format, true).rows;
    expect(row.legs[0].book.map((link) => link.kind)).toEqual(['direct', 'partner']);
    expect(row.legs[1].book.map((link) => link.kind)).toEqual(['direct']);
    expect(row.proSaving).toBeUndefined();
    expect(row.kit).toEqual([]);
  });
});

describe('GET /trip-kit', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks with the cities and window and groups the answer by kind', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(tripKit), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const offers = await getTripKit(['BCN', 'ROM'], '2026-11-02', '2026-11-12');
    expect(fetch.mock.calls[0][0]).toBe(`${FFLY_API_BASE}/trip-kit?cities=BCN,ROM&from=2026-11-02&to=2026-11-12`);
    const groups = kitGroups(offers as TripKitOffer[], format);
    expect(groups.map((group) => [group.kind, group.links.map((link) => link.text)])).toEqual([
      ['hotel', ['Barcelona', 'Rome']],
      ['esim', ['']],
      ['insurance', ['11-02 – 11-12']],
    ]);
  });
});
