// Plain JavaScript so scripts/places.mjs (Node, no TypeScript) builds public/places.json with the same rules the
// page applies to a list fresh from the API.

/** @typedef {import('./ffly-api').Place} Place */

// The main language of each country in the place list whose language the API names places in. Countries with
// several languages and no clear majority (BE, IN, KZ...) and those whose language the API lacks are left out.
/** @type {Readonly<Record<string, string>>} */
export const COUNTRY_LANG = {
  AE: 'ar', BH: 'ar', DZ: 'ar', EG: 'ar', EH: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar', LY: 'ar', MA: 'ar', MR: 'ar',
  OM: 'ar', QA: 'ar', SA: 'ar', SD: 'ar', SY: 'ar', TN: 'ar', YE: 'ar',
  BD: 'bn',
  CZ: 'cs',
  DK: 'da',
  AT: 'de', CH: 'de', DE: 'de', LI: 'de',
  CY: 'el', GR: 'el',
  AR: 'es', BO: 'es', CL: 'es', CO: 'es', CR: 'es', CU: 'es', DO: 'es', EC: 'es', ES: 'es', GQ: 'es', GT: 'es', HN: 'es',
  MX: 'es-MX', NI: 'es', PA: 'es', PE: 'es', PR: 'es', PY: 'es', SV: 'es', UY: 'es', VE: 'es',
  FI: 'fi',
  BF: 'fr', BJ: 'fr', CD: 'fr', CF: 'fr', CG: 'fr', CI: 'fr', CM: 'fr', FR: 'fr', GA: 'fr', GF: 'fr', GN: 'fr', GP: 'fr',
  HT: 'fr', MC: 'fr', MF: 'fr', ML: 'fr', MQ: 'fr', NC: 'fr', NE: 'fr', PF: 'fr', PM: 'fr', RE: 'fr', SN: 'fr', TG: 'fr',
  WF: 'fr', YT: 'fr',
  IL: 'he',
  HR: 'hr',
  HU: 'hu',
  ID: 'id',
  IT: 'it', SM: 'it', VA: 'it',
  JP: 'ja',
  KP: 'ko', KR: 'ko',
  BN: 'ms', MY: 'ms',
  NO: 'nb', SJ: 'nb',
  BQ: 'nl', NL: 'nl', SR: 'nl',
  PL: 'pl',
  AO: 'pt', BR: 'pt-BR', CV: 'pt', GW: 'pt', MZ: 'pt', PT: 'pt', ST: 'pt',
  MD: 'ro', RO: 'ro',
  BY: 'ru', RU: 'ru',
  SK: 'sk',
  SI: 'sl',
  AX: 'sv', SE: 'sv',
  TH: 'th',
  TR: 'tr',
  UA: 'uk',
  VN: 'vi',
  CN: 'zh-Hans',
  HK: 'zh-Hant', MO: 'zh-Hant', TW: 'zh-Hant',
};

const base = (/** @type {string} */ lang) => lang.split('-')[0];

/** @returns {string | undefined} */
export const countryLang = (/** @type {Place['country']} */ country) => (country ? COUNTRY_LANG[country] : undefined);

// The API's `names` are keyed by language (`pt`, sometimes `pt-PT`): the exact key first, then its base language.
/** @returns {string | undefined} */
export const nameIn = (/** @type {Place['names']} */ names, /** @type {string} */ lang) => names?.[lang] || names?.[base(lang)] || undefined;

// The site keeps its own languages of the API's names (`pt-BR` with `pt`), plus, as `local`, the city's name in its
// country's language when the kept names cannot hold it, so "Praha" still finds Prague on every page.
/**
 * @param {readonly Place[]} places
 * @param {readonly string[]} langs
 * @returns {Place[]}
 */
export const withLanguages = (places, langs) =>
  places.map((p) => {
    if (!p.names) return p;
    const names = Object.fromEntries(Object.entries(p.names).filter(([key]) => langs.includes(base(key))));
    const lang = countryLang(p.country);
    const local = lang && !langs.includes(base(lang)) ? nameIn(p.names, lang) : undefined;
    return local && local !== p.name ? { ...p, names, local } : { ...p, names };
  });
