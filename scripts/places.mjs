// Writes src/data/places.json, what the web search form starts from before /meta answers: the web tier's limits
// from /meta and the places from /places (API >= 1.7.0, with every language's names), else /meta's own places.
import { readFileSync, writeFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
const read = (pattern, what) => app.match(pattern)?.[1] ?? fail(`src/app.ts: no ${what}`);
const host = read(/apiHost: '([^']+)'/, 'SERVICE.apiHost');
const base = `https://${host}${read(/FFLY_API_BASE = `https:\/\/\$\{SERVICE\.apiHost\}([^`]*)`/, 'FFLY_API_BASE')}`;
const headers = { 'X-Platform': read(/platform: '([^']+)'/, 'WEB_SEARCH.platform') };
const OUT = new URL('../src/data/places.json', import.meta.url);
// The bundle ships only the site's languages; /places carries all 49 of the app's.
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
// One place per line keeps the diff of a refresh readable.
const body = JSON.stringify(head, null, 2).replace(/\n}$/, `,\n  "places": [\n${places.map((p) => `    ${JSON.stringify(p)}`).join(',\n')}\n  ]\n}\n`);
writeFileSync(OUT, body);
console.log(`${places.length} places, version ${version ?? 'none'}, from ${fresh ? '/places' : '/meta'}`);
