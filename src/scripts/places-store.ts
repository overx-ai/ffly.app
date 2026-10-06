import { WEB_SEARCH } from '../app';
import SNAPSHOT from '../data/places.json';
import { getPlaces, type Meta, type Place, type PlacesAnswer } from './ffly-api';
import { cityOf, placeName } from './places';

export interface PlaceSet {
  version: string | null;
  places: Place[];
}

type Snapshot = Omit<Meta, 'free_searches_left'>;

// Built by scripts/places.mjs: the form works from it before /meta answers, and /meta then corrects it.
export const PLACES_SNAPSHOT = SNAPSHOT as Snapshot;

export const provisionalMeta = (): Meta => ({ ...PLACES_SNAPSHOT, free_searches_left: null });

const snapshotSet = (): PlaceSet => ({ version: PLACES_SNAPSHOT.places_version ?? null, places: PLACES_SNAPSHOT.places });

// The example trip's cities, named in the page's language at build time.
export const exampleCity = (stop: { city: string; code: string }, lang: string) => {
  const place = cityOf(PLACES_SNAPSHOT.places, stop.code);
  return place ? placeName(place, lang) : stop.city;
};

type Box = Pick<Storage, 'getItem' | 'setItem'>;

const isPlaceSet = (value: unknown): value is PlaceSet => {
  const set = value as Partial<PlaceSet> | null;
  return (
    typeof set?.version === 'string' &&
    Array.isArray(set.places) &&
    set.places.length > 0 &&
    set.places.every((p) => typeof p?.code === 'string' && typeof p.name === 'string')
  );
};

// The visitor's own copy of the places, kept under the API's places_version: a page opens on it at once, and only a
// new version is fetched again (conditionally, so an unchanged list costs a 304).
export class PlacesStore {
  private held: PlaceSet;

  constructor(
    private readonly box: Box | undefined,
    private readonly snapshot: PlaceSet = snapshotSet(),
    private readonly fetchPlaces: (version?: string) => Promise<PlacesAnswer> = getPlaces,
  ) {
    this.held = this.read() ?? snapshot;
  }

  get current(): PlaceSet {
    return this.held;
  }

  async refresh(meta: Pick<Meta, 'places' | 'places_version'>): Promise<PlaceSet> {
    const version = meta.places_version;
    if (!version) return this.keep({ version: null, places: meta.places }, false);
    if (version === this.held.version) return this.held;
    if (version === this.snapshot.version) return this.keep(this.snapshot, true);
    try {
      const answer = await this.fetchPlaces(this.held.version ?? undefined);
      if (answer.kind === 'same') return this.held;
      return this.keep({ version: answer.version ?? version, places: answer.places }, true);
    } catch {
      return this.keep({ version: null, places: meta.places }, false);
    }
  }

  private keep(set: PlaceSet, store: boolean): PlaceSet {
    this.held = set;
    if (store) this.write(set);
    return set;
  }

  private read(): PlaceSet | undefined {
    try {
      const value: unknown = JSON.parse(this.box?.getItem(WEB_SEARCH.placesKey) ?? 'null');
      return isPlaceSet(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private write(set: PlaceSet) {
    try {
      this.box?.setItem(WEB_SEARCH.placesKey, JSON.stringify(set));
    } catch {
      // A full or blocked storage only means the next page starts from the snapshot again.
    }
  }
}
