import type { Leg, Route, SearchRequest } from './ffly-api';
import { fold } from './places';
import { routePlaces } from './share-text';

// Visa flags by passport, ported from the app's VisaRules (ios-ffly spec 029) and its MIT Passport Index table
// (public/visa.json). The passports never leave the browser; a flag is a "may need a visa", never a promise.

export type CountryOf = (place: string) => string | null | undefined;

// The Schengen area, the visa zone (not the EU: Ireland and Cyprus are outside it, Norway and Switzerland inside). A
// traveller already inside it holds whatever it asks for, so a hop or a stay inside it is never flagged.
export const SCHENGEN: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IS',
  'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

const inSchengen = (country: string | null | undefined) => Boolean(country && SCHENGEN.has(country));

// The passports the table knows (tests/visa.test.ts holds it to public/visa.json), so the picker opens without the table.
export const PASSPORTS: readonly string[] = (
  'AD,AE,AF,AG,AL,AM,AO,AR,AT,AU,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BN,BO,BR,BS,BT,BW,BY,BZ,CA,CD,CF,CG,CH,CI,CL,CM,CN,CO,CR,CU,' +
  'CV,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,ER,ES,ET,FI,FJ,FM,FR,GA,GB,GD,GE,GH,GM,GN,GQ,GR,GT,GW,GY,HK,HN,HR,HT,HU,ID,IE,IL,IN,' +
  'IQ,IR,IS,IT,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MG,MH,MK,ML,MM,MN,MO,MR,' +
  'MT,MU,MV,MW,MX,MY,MZ,NA,NE,NG,NI,NL,NO,NP,NR,NZ,OM,PA,PE,PG,PH,PK,PL,PS,PT,PW,PY,QA,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SI,SK,' +
  'SL,SM,SN,SO,SR,SS,ST,SV,SY,SZ,TD,TG,TH,TJ,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,US,UY,UZ,VA,VC,VE,VN,VU,WS,XK,YE,ZA,ZM,ZW'
).split(',');

// For each passport, the destinations it does not enter visa-free.
export type VisaTable = Readonly<Record<string, readonly string[]>>;

export function readTable(value: unknown): VisaTable | undefined {
  const table = (value as { visaRequired?: unknown } | null)?.visaRequired;
  if (typeof table !== 'object' || table === null) return undefined;
  const ok = Object.values(table).every((list) => Array.isArray(list) && list.every((code) => typeof code === 'string'));
  return ok ? (table as VisaTable) : undefined;
}

// A destination needs a visa only when every passport needs one there; an unknown passport is never judged.
export function needsVisa(table: VisaTable, destination: string, passports: readonly string[]): boolean {
  if (!passports.length || !passports.every((passport) => table[passport])) return false;
  return passports.every((passport) => table[passport].includes(destination));
}

// The countries of `cities` that need a visa for every passport, each once, in the cities' order. A trip starting
// inside the Schengen area flags none of its Schengen countries.
export function countriesNeedingVisa(table: VisaTable, cities: readonly string[], start: string | undefined, countryOf: CountryOf, passports: readonly string[]): string[] {
  if (!passports.length) return [];
  const fromSchengen = inSchengen(start && countryOf(start));
  const countries = cities.map(countryOf).filter((c): c is string => Boolean(c) && !(fromSchengen && inSchengen(c)));
  return [...new Set(countries)].filter((country) => needsVisa(table, country, passports));
}

// The API names no connecting airport, so the flag is generic: a self-transfer may mean a visa for the country changed
// in, or a second check-in. A hop from inside the Schengen area to inside it is never flagged.
export const warnsConnection = (leg: Pick<Leg, 'stops' | 'from_place' | 'to_place'>, countryOf: CountryOf) =>
  leg.stops > 0 && ![leg.from_place, leg.to_place].every((place) => inSchengen(countryOf(place)));

// Every city the route stays in, the visited city it ends in last, and a one-way trip's destination.
export function stayCities(route: Route, request: Pick<SearchRequest, 'start' | 'cities'>): string[] {
  const places = routePlaces(route);
  const last = places[places.length - 1];
  const ends = places.length > 1 && last && last !== request.start && (request.cities.includes(last) || !request.cities.length);
  return [...places.slice(1, -1), ...(ends ? [last] : [])];
}

const CONTAINS_FROM = 3;

// Exact code, then name prefix, then contains; an empty query lists every passport.
function passportRank(code: string, name: string, q: string): number | undefined {
  if (!q) return 1;
  if (code.toLowerCase() === q) return 0;
  if (name.startsWith(q)) return 1;
  if (q.length >= CONTAINS_FROM && name.includes(q)) return 2;
  return undefined;
}

// Countries by their name in the page's language or their code.
export function matchPassports(query: string, nameOf: (code: string) => string, exclude: readonly string[], limit: number): string[] {
  const q = fold(query.trim());
  const ranked = PASSPORTS.filter((code) => !exclude.includes(code)).flatMap((code) => {
    const name = fold(nameOf(code));
    const rank = passportRank(code, name, q);
    return rank === undefined ? [] : [{ code, name, rank }];
  });
  return ranked
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => entry.code);
}
