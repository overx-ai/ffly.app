import type { Place } from './ffly-api';

// Chip-list rules shared by the cities to visit and the places to finish, as in the app's SearchFormModel.
export function addPlace(list: readonly string[], code: string, max: number): string[] {
  if (list.includes(code)) return [...list];
  if (max <= 1) return [code];
  return list.length < max ? [...list, code] : [...list];
}

export const removePlace = (list: readonly string[], code: string) => list.filter((c) => c !== code);

// The API's `names` are keyed by language (`pt`, sometimes `pt-PT`); the English `name` covers every gap.
export function placeName(place: Pick<Place, 'name' | 'names'>, lang: string): string {
  const names = place.names;
  return names?.[lang] || names?.[lang.split('-')[0]] || place.name;
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
