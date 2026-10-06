import type { Place } from './ffly-api';
import { countryLang, nameIn } from './local-names.mjs';

export { withLanguages } from './local-names.mjs';

// Chip-list rules shared by the cities to visit and the places to finish, as in the app's SearchFormModel.
export function addPlace(list: readonly string[], code: string, max: number): string[] {
  if (list.includes(code)) return [...list];
  if (max <= 1) return [code];
  return list.length < max ? [...list, code] : [...list];
}

export const removePlace = (list: readonly string[], code: string) => list.filter((c) => c !== code);

// The English `name` covers every gap in the page's language.
export const placeName = (place: Pick<Place, 'name' | 'names'>, lang: string): string => nameIn(place.names, lang) || place.name;

export interface LocalName {
  name: string;
  lang: string;
}

// The city's name in its own country's language: kept apart as `local`, or among the names when the site keeps that language.
export function localOf(place: Pick<Place, 'name' | 'names' | 'country' | 'local'>): LocalName | undefined {
  const lang = countryLang(place.country);
  const name = lang && (place.local || nameIn(place.names, lang));
  return lang && name && name !== place.name ? { name, lang } : undefined;
}

// Every name a place answers to: the page language's, the English and the local.
export function placeNames(place: Place, lang: string): string[] {
  const local = localOf(place)?.name;
  return local ? [placeName(place, lang), place.name, local] : [placeName(place, lang), place.name];
}

export interface OptionParts {
  name: string;
  english: string;
  local?: LocalName;
  airports: string[];
  allAirports: boolean;
}

// A suggestion row: the name the chosen field will show, then the English and local names where they differ, and a
// city's airports, labelled, when it has more than one (the app's hasAirportChoice).
export function optionParts(place: Place, lang: string): OptionParts {
  const name = placeName(place, lang);
  const local = localOf(place);
  const airports = place.airports && place.airports.length > 1 ? place.airports : [];
  return {
    name,
    english: name === place.name ? '' : place.name,
    local: local && local.name !== name ? local : undefined,
    airports,
    allAirports: airports.length > 0,
  };
}

// Letters NFD leaves whole, so "lodz" still finds Łódź.
const UNSPLIT: Record<string, string> = { ł: 'l', ø: 'o', đ: 'd', ß: 'ss', æ: 'ae', œ: 'oe', ı: 'i' };

export const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[łøđßæœı]/g, (ch) => UNSPLIT[ch]);

// The city an airport belongs to (WAW is Warsaw, FCO is Rome), else the place with that code.
export const cityOf = (places: readonly Place[], code: string) =>
  places.find((p) => p.airports?.includes(code)) ?? places.find((p) => p.code === code);

// A country by its ISO code in the page's language, to tell apart places of the same name ("London · Canada").
export function countryNamer(lang: string): (country?: string | null) => string {
  let names: Intl.DisplayNames;
  try {
    names = new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' });
  } catch {
    return () => '';
  }
  return (country) => {
    try {
      return (country && names.of(country)) || '';
    } catch {
      return '';
    }
  };
}
