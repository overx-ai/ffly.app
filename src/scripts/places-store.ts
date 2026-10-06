import { WEB_SEARCH } from '../app';
import HEAD from '../data/web-meta.json';
import { LANGS } from '../i18n/locales';
import { getPlaces, timeout, type Meta, type Place, type PlacesAnswer } from './ffly-api';
import { withLanguages } from './places';

export interface PlaceSet {
  version: string | null;
  places: Place[];
}

// Built by scripts/places.mjs with public/places.json: the limits the form opens on before /meta answers, and the
// version of that static place list.
export const WEB_META = HEAD as Omit<Meta, 'free_searches_left' | 'places'>;

export const provisionalMeta = (): Meta => ({ ...WEB_META, places: [], free_searches_left: null });

const SITE_LANGS = LANGS.map((l) => l.code);

const isPlaceSet = (value: unknown): value is PlaceSet => {
  const set = value as Partial<PlaceSet> | null;
  return (
    (typeof set?.version === 'string' || set?.version === null) &&
    Array.isArray(set.places) &&
    set.places.length > 0 &&
    set.places.every((p) => typeof p?.code === 'string' && typeof p.name === 'string')
  );
};

export async function fetchStaticPlaces(): Promise<PlaceSet> {
  const res = await fetch(WEB_SEARCH.placesUrl, { signal: timeout() });
  if (!res.ok) throw new Error(`GET ${WEB_SEARCH.placesUrl}: ${res.status}`);
  const body: unknown = await res.json();
  if (!isPlaceSet(body)) throw new Error(`GET ${WEB_SEARCH.placesUrl}: no places`);
  return body;
}

type Box = Pick<Storage, 'getItem' | 'setItem'>;

interface Sources {
  staticVersion: string | null;
  loadStatic: () => Promise<PlaceSet>;
  fetchPlaces: (version?: string) => Promise<PlacesAnswer>;
}

const DEFAULT_SOURCES: Sources = { staticVersion: WEB_META.places_version ?? null, loadStatic: fetchStaticPlaces, fetchPlaces: getPlaces };

// The visitor's own copy of the places, kept under the API's places_version: a page opens on it at once, and only a
// new version is fetched again. Without one the list comes from the site's static file, fetched only when a place
// field needs it; the API's /places (conditional, so an unchanged list costs a 304) only when that file is behind.
export class PlacesStore {
  private held: PlaceSet | undefined;
  private staticLoad: Promise<PlaceSet> | undefined;
  private readonly sources: Sources;

  constructor(
    private readonly box: Box | undefined,
    sources: Partial<Sources> = {},
  ) {
    this.sources = { ...DEFAULT_SOURCES, ...sources };
    this.held = this.read();
  }

  get current(): PlaceSet | undefined {
    return this.held;
  }

  async load(): Promise<PlaceSet | undefined> {
    if (this.held) return this.held;
    try {
      const set = await this.staticSet();
      return this.held ?? this.keep(set);
    } catch {
      return undefined;
    }
  }

  async refresh(meta: Pick<Meta, 'places' | 'places_version'>): Promise<PlaceSet> {
    const version = meta.places_version;
    const fromMeta = () => this.keep({ version: null, places: meta.places });
    if (!version) return fromMeta();
    if (version === this.held?.version) return this.held;
    try {
      if (version === this.sources.staticVersion) {
        const set = await this.staticSet();
        if (set.version === version) return this.keep(set);
      }
      const answer = await this.sources.fetchPlaces(this.held?.version ?? undefined);
      if (answer.kind === 'same') return this.held ?? fromMeta();
      return this.keep({ version: answer.version ?? version, places: withLanguages(answer.places, SITE_LANGS) });
    } catch {
      return fromMeta();
    }
  }

  private staticSet(): Promise<PlaceSet> {
    this.staticLoad ??= this.sources.loadStatic().catch((err: unknown) => {
      this.staticLoad = undefined;
      throw err;
    });
    return this.staticLoad;
  }

  // Only a versioned list is stored: /meta's own places stand in for one page and are never kept.
  private keep(set: PlaceSet): PlaceSet {
    this.held = set;
    if (set.version) this.write(set);
    return set;
  }

  private read(): PlaceSet | undefined {
    try {
      const value: unknown = JSON.parse(this.box?.getItem(WEB_SEARCH.placesKey) ?? 'null');
      return isPlaceSet(value) && value.version ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private write(set: PlaceSet) {
    try {
      this.box?.setItem(WEB_SEARCH.placesKey, JSON.stringify(set));
    } catch {
      // A full or blocked storage only means the next page loads the list again.
    }
  }
}
