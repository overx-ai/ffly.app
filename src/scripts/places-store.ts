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
// version of that static place list (never null: public/places.json is cached for good under it).
export const WEB_META = HEAD as Omit<Meta, 'free_searches_left' | 'places' | 'places_version'> & { places_version: string };

export const provisionalMeta = (): Meta => ({ ...WEB_META, free_searches_left: null });

const SITE_LANGS = LANGS.map((l) => l.code);

// The places version is a hash of the API's list, which a new site language leaves as it is, yet the site's copy of
// the list then carries more names: the stored copy and the static URL are marked with the site's languages too.
export const PLACES_LANGS = SITE_LANGS.join(',');

const isPlaceSet = (value: unknown): value is PlaceSet => {
  const set = value as Partial<PlaceSet> | null;
  return (
    (typeof set?.version === 'string' || set?.version === null) &&
    Array.isArray(set.places) &&
    set.places.length > 0 &&
    set.places.every((p) => typeof p?.code === 'string' && typeof p.name === 'string')
  );
};

// The version and languages name the file, so the HTTP cache may keep it for good (vercel.json) and a new list is a new URL.
const STATIC_URL = `${WEB_SEARCH.placesUrl}?v=${encodeURIComponent(WEB_META.places_version)}&l=${encodeURIComponent(PLACES_LANGS)}`;

export async function fetchStaticPlaces(): Promise<PlaceSet> {
  const res = await fetch(STATIC_URL, { signal: timeout() });
  if (!res.ok) throw new Error(`GET ${STATIC_URL}: ${res.status}`);
  const body: unknown = await res.json();
  if (!isPlaceSet(body)) throw new Error(`GET ${STATIC_URL}: no places`);
  return body;
}

type Box = Pick<Storage, 'getItem' | 'setItem'>;

type Stored = PlaceSet & { langs: string };

interface Sources {
  staticVersion: string | null;
  loadStatic: () => Promise<PlaceSet>;
  fetchPlaces: (version?: string) => Promise<PlacesAnswer>;
}

const DEFAULT_SOURCES: Sources = { staticVersion: WEB_META.places_version, loadStatic: fetchStaticPlaces, fetchPlaces: getPlaces };

// The visitor's own copy of the places, kept under the API's places_version, a hash of the list, and the site's
// languages: a copy at /meta's version and these languages is never fetched again. It is read (a large parse) only
// when the places are first asked for. Without one the list comes from the site's static file; the API's /places
// (conditional, so an unchanged list costs a 304) only when that file is behind.
export class PlacesStore {
  private held: PlaceSet | undefined;
  private wasRead = false;
  private staticLoad: Promise<PlaceSet> | undefined;
  private readonly sources: Sources;

  constructor(
    private readonly box: Box | undefined,
    sources: Partial<Sources> = {},
  ) {
    this.sources = { ...DEFAULT_SOURCES, ...sources };
  }

  async load(): Promise<PlaceSet | undefined> {
    const stored = this.readStored();
    if (stored) return stored;
    try {
      const set = await this.staticSet();
      return this.held ?? this.keep(set);
    } catch {
      return undefined;
    }
  }

  async refresh(meta: Pick<Meta, 'places' | 'places_version'>): Promise<PlaceSet> {
    const held = this.readStored();
    const version = meta.places_version;
    if (!version) return this.fallback(meta);
    if (version === held?.version) return held;
    return (await this.fetchVersion(version).catch(() => undefined)) ?? this.fallback(meta);
  }

  private async fetchVersion(version: string): Promise<PlaceSet | undefined> {
    if (version === this.sources.staticVersion) {
      const set = await this.staticSet();
      if (set.version === version) return this.keep(set);
    }
    const answer = await this.sources.fetchPlaces(this.held?.version ?? undefined);
    if (answer.kind === 'same') return undefined;
    return this.keep({ version: answer.version ?? version, places: withLanguages(answer.places, SITE_LANGS) });
  }

  // An older API still sends /meta's places: they stand in for one page, never stored, and only when nothing else
  // has a list.
  private async fallback(meta: Pick<Meta, 'places'>): Promise<PlaceSet> {
    if (this.held) return this.held;
    const loaded = await this.load();
    if (loaded) return loaded;
    const set = { version: null, places: meta.places ?? [] };
    if (set.places.length) this.held = set;
    return set;
  }

  private readStored(): PlaceSet | undefined {
    if (!this.wasRead) {
      this.wasRead = true;
      this.held ??= this.read();
    }
    return this.held;
  }

  private staticSet(): Promise<PlaceSet> {
    this.staticLoad ??= this.sources.loadStatic().catch((err: unknown) => {
      this.staticLoad = undefined;
      throw err;
    });
    return this.staticLoad;
  }

  private keep(set: PlaceSet): PlaceSet {
    this.held = set;
    if (set.version) this.write(set);
    return set;
  }

  private read(): PlaceSet | undefined {
    try {
      const value: unknown = JSON.parse(this.box?.getItem(WEB_SEARCH.placesKey) ?? 'null');
      if (!isPlaceSet(value) || !value.version || (value as Stored).langs !== PLACES_LANGS) return undefined;
      return { version: value.version, places: value.places };
    } catch {
      return undefined;
    }
  }

  private write(set: PlaceSet) {
    try {
      const stored: Stored = { ...set, langs: PLACES_LANGS };
      this.box?.setItem(WEB_SEARCH.placesKey, JSON.stringify(stored));
    } catch {
      // A full or blocked storage only means the next page loads the list again.
    }
  }
}
