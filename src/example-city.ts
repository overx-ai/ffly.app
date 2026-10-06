import STATIC from '../public/places.json';
import type { Place } from './scripts/ffly-api';
import { cityOf, placeName } from './scripts/places';

const PLACES = STATIC.places as Place[];

// The example trip's cities, named in the page's language at build time from the static place list.
export const exampleCity = (stop: { city: string; code: string }, lang: string) => {
  const place = cityOf(PLACES, stop.code);
  return place ? placeName(place, lang) : stop.city;
};
