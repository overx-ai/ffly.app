// Writes what the web search form starts from before /meta answers: src/data/web-meta.json, the web tier's limits
// and currency (bundled, read at first paint), and public/places.json, the places from /places (API >= 1.7.0, with
// the site's languages' names; else /meta's own places), fetched by the page only when a place field needs them.
import { readFileSync, writeFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
const read = (pattern, what) => app.match(pattern)?.[1] ?? fail(`src/app.ts: no ${what}`);
const host = read(/apiHost: '([^']+)'/, 'SERVICE.apiHost');
const base = `https://${host}${read(/FFLY_API_BASE = `https:\/\/\$\{SERVICE\.apiHost\}([^`]*)`/, 'FFLY_API_BASE')}`;
const headers = { 'X-Platform': read(/platform: '([^']+)'/, 'WEB_SEARCH.platform') };
const HEAD_OUT = new URL('../src/data/web-meta.json', import.meta.url);
const PLACES_OUT = new URL(`../public${read(/placesUrl: '([^']+)'/, 'WEB_SEARCH.placesUrl')}`, import.meta.url);
// The site ships only its own languages; /places carries all 49 of the app's.
const LANG_CODES = [...readFileSync(new URL('../src/i18n/locales.ts', import.meta.url), 'utf8').matchAll(/code: '([a-z]+)'/g)].map((m) => m[1]);
const keepLang = (key) => LANG_CODES.includes(key.split('-')[0]);
// PLACES_FILE: a saved /places body, for a snapshot before that route is deployed.
const PLACES_FILE = process.env.PLACES_FILE;

function fail(message) {
  throw new Error(message);
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers });
  return res.ok ? { body: await res.json(), etag: res.headers.get('ETag') } : undefined;
}

const meta = (await get('/meta'))?.body ?? fail(`${base}/meta did not answer`);
const saved = PLACES_FILE && JSON.parse(readFileSync(PLACES_FILE, 'utf8'));
const fresh = saved ? { body: saved, etag: saved.version } : await get('/places');
const trim = (names) => (names ? Object.fromEntries(Object.entries(names).filter(([k]) => keepLang(k))) : names);
const places = (fresh?.body.places ?? meta.places).map((p) => (p.names ? { ...p, names: trim(p.names) } : p));
const version = fresh?.etag?.replace(/^W\//, '').replace(/^"|"$/g, '') || meta.places_version || null;
if (!Array.isArray(places) || !places.length) fail('no places');

const { max_cities, max_ends, searches_per_day } = meta.tier_limits;
const head = {
  places_version: version,
  currency: meta.currency,
  limits: meta.limits,
  tier_limits: { max_cities, max_ends, searches_per_day },
};
writeFileSync(HEAD_OUT, `${JSON.stringify(head, null, 2)}\n`);
// One place per line keeps the diff of a refresh readable.
writeFileSync(PLACES_OUT, `{"version":${JSON.stringify(version)},"places":[\n${places.map((p) => JSON.stringify(p)).join(',\n')}\n]}\n`);
console.log(`${places.length} places, version ${version ?? 'none'}, from ${fresh ? '/places' : '/meta'}`);
