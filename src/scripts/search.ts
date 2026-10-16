import { CONTRACT_1_12, EVENTS, LIBRARY, PREFS, REQUEST_LIMITS, SIGN_IN, VISA, WEB_SEARCH } from '../app';
import type { Dict } from '../i18n';
import { fill, plural, type Plural, type Vars } from '../i18n/text';
import { setupAccount } from './auth';
import type { Change } from './auth-state';
import { RangePicker, addDays, daysBetween, localToday, stepNights, type Nights } from './calendar';
import { Combobox, matchPlaces } from './combobox';
import {
  ACTIVE,
  API_HOURS,
  NotFound,
  ONE_ADULT,
  OPTION_FIELDS,
  allowedFields,
  allowedOnly,
  buildRequest,
  canLookup,
  createSearch,
  endLimit,
  getMeta,
  getSearch,
  getTripKit,
  isCurrent,
  lookupShared,
  proCaller,
  searchedAt,
  setCaller,
  type ExcludedFlight,
  type Insights,
  type Leg,
  type Meta,
  type OptionField,
  type Place,
  type Route,
  type SearchRequest,
  type SearchView,
  type SubmitOutcome,
  type Tier,
  type Trip,
  type TripOptions,
} from './ffly-api';
import {
  airportsWithin,
  canSkip,
  flightOf,
  landingChoices,
  lastDay,
  makePin,
  minutesOf,
  pinBounds,
  pinIssue,
  stepConnections,
  stepTravellers,
  takeoffChoices,
  toggleAirport,
  travellerRange,
  TRAVELLER_KINDS,
  tripLists,
  tripTypeOf,
  withoutPinned,
  type PinIssue,
  type TravellerKind,
  type TripType,
} from './filters';
import { Library, canCompare, routeKey, searchKey, toggleCompare, type Finished, type HistoryEntry, type SavedRoute } from './library';
import { ask, canAsk, routesReady } from './notify';
import { appHintLine, rotation, type webNudges } from './nudges';
import { addPlace, countryNamer, fold, optionParts, placeName, placeNames, removePlace } from './places';
import { PlacesStore, provisionalMeta, type PlaceSet } from './places-store';
import { quotaNote, quotaSpent } from './quota';
import { cookieString, fillPrefs, finishOf, namesPlaces, parseCookies, sameSearch, savedCookies, sharedRequest, shareUrl, type Prefs } from './prefs';
import { kitGroups, routeRows, type BookLink, type KitGroup, type LegRow, type RouteRow, type Warn } from './results';
import { glideLinks } from './scroll';
import { canShare, routePlaces, shareText, withLink } from './share-text';
import { Ticker } from './ticker';
import { TimeList } from './time-list';
import { track, type TrackEvent, type TrackParams } from './track';
import { countriesNeedingVisa, matchPassports, readTable, stayCities, warnsConnection, type VisaTable } from './visa';

interface Saved {
  id: string;
  request: SearchRequest;
  finished?: boolean;
}

type Field = 'from' | 'back' | 'cities';
type ListName = 'cities' | 'ends';

const MINUTE_S = 60;

// One bundle serves every language: SearchForm renders that page's strings into data-i18n (the CSP allows no
// inline script), and <html lang> is the locale of every date, number and list.
const TEXT = JSON.parse(document.querySelector<HTMLElement>('[data-i18n]')!.dataset.i18n!) as Omit<Dict['widget']['script'], 'nudges'> & {
  nudges: ReturnType<typeof webNudges>;
  nights: Plural;
  loading: string;
  columns: Dict['widget']['columns'];
  offers?: Dict['widget']['offers'];
  account?: Dict['widget']['account'];
};
const MESSAGES = TEXT.messages;
const OPTIONS = TEXT.options;
const ACTIONS = TEXT.actions;
const SHELF = TEXT.library;
// Spec 014's strings, on the page only with CONTRACT_1_12.
const OFFERS = TEXT.offers!;
const LOCALE = document.documentElement.lang;
const count = (forms: Plural, n: number, vars?: Vars) => plural(LOCALE, forms, n, vars);

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const part = <T extends HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T;

const el = {
  form: byId<HTMLFormElement>('search-form'),
  fields: byId<HTMLFieldSetElement>('search-fields'),
  loading: byId('search-loading'),
  from: byId<HTMLInputElement>('from'),
  fromList: byId('from-list'),
  back: byId<HTMLInputElement>('back'),
  backList: byId('back-list'),
  backOne: byId('back-one'),
  backAny: byId('back-any'),
  ends: byId<HTMLUListElement>('ends'),
  endsCount: byId('ends-count'),
  endsHint: byId('ends-hint'),
  city: byId<HTMLInputElement>('city'),
  cityList: byId('city-list'),
  cities: byId<HTMLUListElement>('cities'),
  cityCount: byId('city-count'),
  window: byId<HTMLButtonElement>('window'),
  windowText: byId('window-text'),
  calendar: byId('calendar'),
  calMonths: byId('cal-months'),
  calPrev: byId<HTMLButtonElement>('cal-prev'),
  calNext: byId<HTMLButtonElement>('cal-next'),
  minNights: byId<HTMLOutputElement>('min-nights'),
  maxNights: byId<HTMLOutputElement>('max-nights'),
  chipNudge: byId('chip-nudge'),
  formError: byId('form-error'),
  submit: byId<HTMLButtonElement>('submit'),
  quotaNote: byId('quota-note'),
  inAppLabel: byId('in-app-label'),
  lockedChips: part<HTMLUListElement>(document, '.locked-chips'),
  strip: byId('app-side'),
  nudge: byId('nudge'),
  nudgeDots: byId('nudge-dots'),
  problem: byId('problem'),
  problemText: byId('problem-text'),
  retry: byId<HTMLButtonElement>('retry'),
  progress: byId('progress'),
  progressStatus: byId('progress-status'),
  progressBar: byId('progress-bar'),
  progressFill: byId('progress-fill'),
  progressDetail: byId('progress-detail'),
  queueNudge: byId('queue-nudge'),
  notifyAsk: byId('notify-ask'),
  notifyYes: byId<HTMLButtonElement>('notify-yes'),
  notifyNo: byId<HTMLButtonElement>('notify-no'),
  results: byId('results'),
  resultsTitle: byId('results-title'),
  resultsTrip: byId('results-trip'),
  searchAgain: byId<HTMLButtonElement>('search-again'),
  placeholder: byId('route-placeholder'),
  resultsEmpty: byId('results-empty'),
  insights: byId('insights'),
  appHint: byId('app-hint'),
  routeRows: byId('route-rows'),
  more: byId('more-routes'),
  coverage: byId('coverage'),
  upsell: byId('upsell'),
  progressKit: document.getElementById('progress-kit'),
  tripTypes: [...document.querySelectorAll<HTMLButtonElement>('[data-trip-type]')],
  backField: byId('back-field'),
  toField: byId('to-field'),
  to: byId<HTMLInputElement>('to'),
  toList: byId('to-list'),
  nightsField: byId('nights-field'),
  citiesField: byId('cities-field'),
  optionsToggle: byId<HTMLButtonElement>('options-toggle'),
  options: byId('options'),
  directOnly: byId<HTMLButtonElement>('direct-only'),
  connections: part<HTMLElement>(document, '[data-connections]'),
  connectionsCount: byId<HTMLOutputElement>('connections-count'),
  takeoff: byId<HTMLButtonElement>('takeoff'),
  takeoffList: byId<HTMLUListElement>('takeoff-list'),
  landing: byId<HTMLButtonElement>('landing'),
  landingList: byId<HTMLUListElement>('landing-list'),
  placesOption: byId('places-option'),
  placeOptions: byId<HTMLUListElement>('place-options'),
  passport: byId<HTMLInputElement>('passport'),
  passportList: byId('passport-list'),
  passports: byId<HTMLUListElement>('passports'),
  librarySheet: byId<HTMLDialogElement>('library-sheet'),
  libraryClose: byId<HTMLButtonElement>('library-close'),
  savedEmpty: byId('saved-empty'),
  savedList: byId<HTMLUListElement>('saved-list'),
  compareHint: byId('compare-hint'),
  compare: byId('compare'),
  compareTitle: byId('compare-title'),
  compareRows: byId('compare-rows'),
  historyEmpty: byId('history-empty'),
  historyList: byId<HTMLUListElement>('history-list'),
  skipped: byId('skipped'),
  skippedLabel: byId('skipped-label'),
  skippedList: byId<HTMLUListElement>('skipped-list'),
  skippedUndo: byId<HTMLButtonElement>('skipped-undo'),
  visaNote: byId('visa-note'),
  rating: byId('rating'),
  ratingTitle: byId('rating-title'),
  ratingThanks: byId('rating-thanks'),
  ratingStars: byId('rating-stars'),
  ratingSupport: byId('rating-support'),
  ratingDismiss: byId<HTMLButtonElement>('rating-dismiss'),
};

const clone = (id: string) => byId<HTMLTemplateElement>(id).content.firstElementChild!.cloneNode(true) as HTMLElement;

let meta: Meta;
let money: Intl.NumberFormat;
let places: Place[] = [];
let byCode = new Map<string, Place>();
let pickedFrom: string | undefined;
const lists: Record<ListName, string[]> = { cities: [], ends: [] };
let nights: Nights = { min: WEB_SEARCH.minNights, max: WEB_SEARCH.maxNights };
let retryAction: (() => void) | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let askedToNotify = false;
let adsPushed = false;
let tripType: TripType = 'multi';
let destination: string | undefined;
// Spec 015: the visitor's options, a link's hidden ones included; buildRequest sends only what the API allows.
let options: TripOptions = {};
let allowed = new Set<OptionField>();
const refused = new Set<string>();
let passports: string[] = [];
let visaTable: VisaTable | undefined;
let visaAsked = false;
interface ShownResult {
  view: SearchView;
  request: SearchRequest;
}
// The result on the page, and the ones a skipped flight replaced: Undo brings one back without a search.
let shown: ShownResult | undefined;
const undo: ShownResult[] = [];

const localName = (place: Place) => placeName(place, LOCALE);
const countryName = countryNamer(LOCALE);
const nameOf = (code: string) => {
  const place = byCode.get(code);
  return place ? localName(place) : code;
};
const tier = (): Tier => meta?.tier ?? 'free';
const isPro = () => proCaller(meta, CONTRACT_1_12);
const maxCities = () => Math.min(meta.tier_limits.max_cities, meta.limits.max_cities);
const maxEnds = () => endLimit(meta);
const severalEnds = () => maxEnds() > 1;
const formatMoney = (amount: number) => money.format(amount);

const listOf = new Intl.ListFormat(LOCALE, { type: 'conjunction' });
const anyOf = new Intl.ListFormat(LOCALE, { type: 'disjunction' });
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const countFormat = new Intl.NumberFormat(LOCALE);
const searchedFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
// The home page keeps the address on its #search section; /search has no such anchor.
const SHARE_HASH = document.getElementById('search') ? '#search' : '';
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));
const formatDays = (from: string, to: string) => `${formatDay(from)} – ${formatDay(to)}`;

const picker = new RangePicker({
  trigger: el.window,
  label: el.windowText,
  dialog: el.calendar,
  months: el.calMonths,
  prev: el.calPrev,
  next: el.calNext,
  maxDays: () => meta.limits.max_window_days,
  format: ({ from, to }) => formatDays(from, to),
  locale: LOCALE,
});

function setTexts(root: ParentNode, texts: Record<string, string>) {
  for (const [selector, text] of Object.entries(texts)) part(root, selector).textContent = text;
}

function showText(node: HTMLElement, text: string) {
  node.textContent = text;
  node.hidden = !text;
}

// A redraw replaces the button that was pressed, which drops the focus to the page: it goes to the new one.
function refocus(root: ParentNode, match: (button: HTMLButtonElement) => boolean) {
  [...root.querySelectorAll<HTMLButtonElement>('button')].find(match)?.focus();
}

function resolvePlace(raw: string): string | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  if (byCode.has(text.toUpperCase())) return text.toUpperCase();
  const typed = fold(text);
  return places.find((p) => placeNames(p, LOCALE).some((name) => fold(name) === typed))?.code;
}

function remembered(field: Field, on: boolean) {
  for (const tag of document.querySelectorAll<HTMLElement>(`[data-remembered="${field}"]`)) tag.hidden = !on;
}

function storage(kind: 'sessionStorage' | 'localStorage' = 'sessionStorage'): Storage | undefined {
  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

const save = (saved: Saved) => storage()?.setItem(WEB_SEARCH.storageKey, JSON.stringify(saved));
const forget = () => storage()?.removeItem(WEB_SEARCH.storageKey);
const placesStore = new PlacesStore(storage('localStorage'));
const library = new Library(storage('localStorage'));
let historyFailed = false;

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);

function isSaved(value: unknown): value is Saved {
  const saved = value as Partial<Saved> | null;
  const r = saved?.request as Partial<SearchRequest> | undefined;
  return (
    isText(saved?.id) &&
    r !== undefined &&
    isText(r.start) &&
    isTextList(r.ends) &&
    isTextList(r.cities) &&
    isText(r.date_from) &&
    isText(r.date_to) &&
    Number.isInteger(r.min_nights) &&
    Number.isInteger(r.max_nights) &&
    isText(r.client_request_id)
  );
}

function load(): Saved | undefined {
  const raw = storage()?.getItem(WEB_SEARCH.storageKey);
  if (!raw) return undefined;
  const saved = parseJson(raw);
  if (isSaved(saved)) return saved;
  forget();
  return undefined;
}

function placeOption(place: Place): HTMLElement {
  const row = clone('place-option-template');
  const parts = optionParts(place, LOCALE);
  part(row, '.place-local').textContent = parts.name;
  showText(part(row, '.place-alt'), parts.english);
  const native = part(row, '.place-native');
  showText(native, parts.local?.name ?? '');
  if (parts.local) native.lang = parts.local.lang;
  showText(part(row, '.place-country'), countryName(place.country));
  part(row, '.place-airports').hidden = !parts.allAirports;
  showText(part(row, '.place-all'), parts.allAirports ? TEXT.allAirports : '');
  showText(part(row, '.place-codes'), parts.airports.join(' · '));
  part(row, '.place-code').textContent = place.code;
  return row;
}

function placeNotice(text: string): HTMLElement {
  const row = clone('place-notice-template');
  part(row, '.notice-text').textContent = text;
  if (text === TEXT.loading) part(row, 'svg').remove();
  return row;
}

const comboOf = (input: HTMLInputElement) => input.closest<HTMLElement>('.combo')!;
const boxes = new Map<HTMLInputElement, Pick<Combobox, 'update' | 'close'>>();

type Codes = () => (string | undefined)[];

// Until the place list is there a field says it is loading, never that nothing matches.
function placeBox(input: HTMLInputElement, list: HTMLElement, exclude: Codes, onPick: (place: Place) => void, notice?: () => string | undefined) {
  const box = new Combobox({
    input,
    list,
    options: (query) =>
      matchPlaces(places, query, { exclude: new Set(exclude().filter(isText)), limit: WEB_SEARCH.placeMatches, lang: LOCALE }),
    renderOption: placeOption,
    renderNotice: placeNotice,
    notice: () => (places.length ? notice?.() : TEXT.loading),
    onPick,
  });
  boxes.set(input, box);
  return box;
}

function setFrom(code: string | undefined) {
  pickedFrom = code;
  el.from.value = code ? nameOf(code) : '';
  renderPlaceOptions();
}

interface ChipList {
  chips: HTMLUListElement;
  input: HTMLInputElement;
  count: HTMLElement;
  max: () => number;
  exclude: Codes;
  remembered: Field;
  rendered?: () => void;
}

const BACK_PLACEHOLDER = el.back.placeholder;

// With a cap of 1 (the API's web tier until it allows more) Back to stays one plain field, as before chips existed.
function renderEnds() {
  const several = severalEnds();
  const ends = lists.ends;
  for (const node of [el.ends, el.endsCount, el.endsHint]) node.hidden = !several;
  el.backOne.hidden = ends.length > 1;
  el.backAny.hidden = ends.length < 2;
  if (!several) {
    el.back.value = ends[0] ? nameOf(ends[0]) : '';
    return;
  }
  comboOf(el.back).hidden = ends.length >= maxEnds();
  el.back.placeholder = ends.length ? el.ends.dataset.placeholder! : BACK_PLACEHOLDER;
  el.back.setAttribute('aria-describedby', 'back-hint ends-hint');
}

const LISTS: Record<ListName, ChipList> = {
  cities: {
    chips: el.cities,
    input: el.city,
    count: el.cityCount,
    max: maxCities,
    exclude: () => [pickedFrom, ...lists.ends],
    remembered: 'cities',
    // Pro is never shown Free's cap notice, so a full list hides its input, as Back to does.
    rendered: () => {
      comboOf(el.city).hidden = isPro() && lists.cities.length >= maxCities();
    },
  },
  ends: {
    chips: el.ends,
    input: el.back,
    count: el.endsCount,
    max: maxEnds,
    exclude: () => lists.cities,
    remembered: 'back',
    rendered: renderEnds,
  },
};

// A chip list hides its own picks from its options; a single field (cap 1) may pick its value again.
const taken = (name: ListName) => [...LISTS[name].exclude(), ...(LISTS[name].max() > 1 ? lists[name] : [])];

function renderList(name: ListName) {
  const list = LISTS[name];
  const codes = lists[name];
  list.chips.replaceChildren(
    ...codes.map((code) => {
      const chip = clone('chip-template');
      part(chip, '.chip-name').textContent = nameOf(code);
      if (name === 'cities') maybeToggle(chip, code);
      const remove = part<HTMLButtonElement>(chip, '.chip-remove');
      remove.setAttribute('aria-label', fill(MESSAGES.removeCity, { name: nameOf(code) }));
      remove.addEventListener('click', () => {
        lists[name] = removePlace(lists[name], code);
        remembered(list.remembered, false);
        renderList(name);
        list.input.focus();
      });
      return chip;
    }),
  );
  list.count.textContent = fill(MESSAGES.cityCount, { n: codes.length, max: list.max() });
  list.rendered?.();
  renderPlaceOptions();
}

function addTo(name: ListName, code: string) {
  const list = LISTS[name];
  if (list.exclude().includes(code)) {
    el.formError.textContent = MESSAGES.overlap;
    return;
  }
  lists[name] = addPlace(lists[name], code, list.max());
  list.input.value = '';
  remembered(list.remembered, false);
  renderList(name);
  // A full list hides its input (Back to), so focus moves to the last chip instead of being lost.
  if (comboOf(list.input).hidden) part<HTMLButtonElement>(list.chips, 'li:last-child .chip-remove').focus();
}

function setLists(ends: string[], cities: string[]) {
  lists.ends = ends.slice(0, maxEnds());
  lists.cities = cities.slice(0, maxCities());
  renderList('ends');
  renderList('cities');
}

function limitStepper(stepper: HTMLElement, atMin: boolean, atMax: boolean) {
  part<HTMLButtonElement>(stepper, '[data-step="-1"]').disabled = atMin;
  part<HTMLButtonElement>(stepper, '[data-step="1"]').disabled = atMax;
}

function renderNights() {
  const limit = meta?.limits.max_nights ?? nights.max;
  el.minNights.value = String(nights.min);
  el.maxNights.value = String(nights.max);
  for (const stepper of document.querySelectorAll<HTMLElement>('.stepper[data-nights]')) {
    const value = nights[stepper.dataset.nights as keyof Nights];
    limitStepper(stepper, value <= 1, value >= limit);
  }
}

function renderQuota() {
  el.quotaNote.textContent = quotaNote(meta, isPro(), MESSAGES, LOCALE);
}

// Spec 016: a Pro account sees none of Free's nudges: no app strip, no queue line, no quota note.
function renderPlan() {
  const pro = isPro();
  el.strip.hidden = pro;
  el.queueNudge.hidden = pro;
  renderQuota();
}

const cityLimitLine = () => (isPro() ? MESSAGES.invalid : count(MESSAGES.cityLimit, maxCities()));

function defaultWindow() {
  const from = addDays(localToday(), WEB_SEARCH.startInDays);
  return { from, to: addDays(from, WEB_SEARCH.windowDays) };
}

// Fields being typed in keep their text: only picks are renamed, and an open list redraws.
function usePlaces(set: PlaceSet | undefined) {
  if (!set || set.places === places) return;
  places = set.places;
  byCode = new Map(places.map((p) => [p.code, p]));
  renderNames();
  for (const box of boxes.values()) box.update();
}

let placesAsked!: () => void;
const askedForPlaces = new Promise<void>((resolve) => (placesAsked = resolve));

const loadPlaces = () => {
  placesAsked();
  return placesStore.load().then(usePlaces);
};

function useMeta(next: Meta) {
  meta = next;
  money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: meta.currency });
}

const caps = () => `${maxCities()}/${maxEnds()}`;

// The form opened on the snapshot's limits; the live ones rarely differ, and only then are the lists redrawn.
function applyMeta(next: Meta) {
  const before = caps();
  const wasSeveral = severalEnds();
  useMeta(next);
  if (caps() !== before) {
    setLists(lists.ends, lists.cities);
    if (!wasSeveral && severalEnds() && lists.ends.length) el.back.value = '';
  }
  renderNights();
  renderPlan();
  applyGate();
}

function renderNames() {
  if (pickedFrom) setFrom(pickedFrom);
  if (destination) setDestination(destination);
  for (const name of ['ends', 'cities'] as const) if (lists[name].length) renderList(name);
  renderPassports();
}

const airportsOfPlace = (code: string) => byCode.get(code)?.airports ?? [];

// A link with no city and a place to finish is a one-way trip; every other link opens the multi-city form.
function setupForm(cookies: Map<string, string>): Prefs {
  const limits = { maxNights: meta.limits.max_nights, maxWindowDays: meta.limits.max_window_days };
  const prefs = fillPrefs(new URLSearchParams(location.search), cookies, (code) => byCode.has(code), limits, airportsOfPlace);
  const oneWay = prefs.cities.source === 'query' && !prefs.cities.value.length;
  setFrom(prefs.from.value);
  setLists(oneWay ? [] : prefs.back.value, prefs.cities.value);
  if (oneWay) {
    setDestination(prefs.back.value[0]);
    setTripType('oneway');
  }
  for (const field of ['from', 'back', 'cities'] as const) remembered(field, prefs[field].source === 'cookie');
  const dates = prefs.dates.value;
  if (dates && dates.from >= localToday()) picker.set(dates);
  if (prefs.nights.value) nights = prefs.nights.value;
  options = prefs.options;
  renderNights();
  renderQuota();
  renderOptions();
  return prefs;
}

// Every option of a request but its skipped flights, which belong to the result they were skipped on.
const optionsOfRequest = (r: SearchRequest): TripOptions =>
  Object.fromEntries(OPTION_FIELDS.filter((field) => field !== 'excluded' && r[field] !== undefined).map((field) => [field, r[field]]));

function fillForm(r: SearchRequest) {
  for (const field of ['from', 'back', 'cities'] as const) remembered(field, false);
  const type = tripTypeOf(r);
  setFrom(r.start);
  if (type === 'multi') setLists(finishOf(r), r.cities);
  else setDestination(type === 'round' ? r.cities[0] : r.ends[0]);
  setTripType(type);
  picker.set({ from: r.date_from, to: r.date_to });
  nights = { min: r.min_nights, max: r.max_nights };
  options = optionsOfRequest(r);
  renderNights();
  renderOptions();
}

// Text typed in Back to but never picked counts when it names a place; with a cap of 1 the field's text is the pick.
function readEnds(): string[] | undefined {
  const typed = el.back.value.trim();
  if (!typed || (!severalEnds() && lists.ends.length)) return lists.ends;
  const code = resolvePlace(typed);
  return code ? addPlace(lists.ends, code, maxEnds()) : undefined;
}

function readPlaces(from: string): { ends: string[]; cities: string[] } | string {
  if (tripType !== 'multi') {
    const to = destination ?? resolvePlace(el.to.value);
    if (!to) return MESSAGES.to;
    if (to === from) return MESSAGES.overlap;
    return tripLists(tripType, from, to);
  }
  const ends = readEnds();
  if (!ends) return MESSAGES.end;
  const cities = lists.cities;
  if (!cities.length) return MESSAGES.noCities;
  if (cities.length > maxCities()) return cityLimitLine();
  if ([from, ...ends].some((code) => cities.includes(code))) return MESSAGES.overlap;
  return { ends, cities: [...cities] };
}

// The options as this trip type takes them: maybes and pins belong to the multi-city cities, a pinned city is a must.
function tripOptions(start: string, ends: string[], cities: string[]): TripOptions {
  const multi = tripType === 'multi';
  const pinned = multi ? (options.pinned ?? []).filter((pin) => cities.includes(pin.city)) : [];
  const optional = multi ? withoutPinned((options.optional ?? []).filter((city) => cities.includes(city)), pinned) : [];
  const { excluded: _, ...chosen } = options;
  return { ...chosen, optional, pinned, airports: airportsWithin(options.airports ?? {}, [start, ...ends, ...cities]) };
}

function pinMessage(issue: PinIssue): string {
  if (issue.kind === 'tooMany') return MESSAGES.invalid;
  if (issue.kind === 'overlap') return fill(OPTIONS.pinIssue.overlap, { name: nameOf(issue.city), other: nameOf(issue.other) });
  return fill(OPTIONS.pinIssue[issue.kind === 'notACity' ? 'outsideWindow' : issue.kind], { name: nameOf(issue.city) });
}

function readForm(): Trip | string {
  const from = pickedFrom ?? resolvePlace(el.from.value);
  if (!from) return MESSAGES.start;
  const placesRead = readPlaces(from);
  if (typeof placesRead === 'string') return placesRead;
  const { ends, cities } = placesRead;

  const { from: dateFrom, to: dateTo } = picker.range;
  if (!dateFrom || !dateTo) return MESSAGES.dates;
  if (dateFrom < localToday()) return MESSAGES.past;
  const span = daysBetween(dateFrom, dateTo);
  if (!(span > 0 && span <= meta.limits.max_window_days)) return fill(MESSAGES.window, { max: meta.limits.max_window_days });

  const limit = meta.limits.max_nights;
  if (nights.min < 1 || nights.max > limit || nights.min > nights.max) return fill(MESSAGES.nights, { max: limit });

  const chosen = tripOptions(from, ends, cities);
  const issue = allowed.has('pinned') ? pinIssue({ cities, date_from: dateFrom, date_to: dateTo, max_nights: nights.max, pinned: chosen.pinned }) : undefined;
  if (issue) return pinMessage(issue);
  return { start: from, ends, cities, dateFrom, dateTo, minNights: nights.min, maxNights: nights.max, options: chosen };
}

const withNewRequestId = (request: SearchRequest): SearchRequest => ({ ...request, client_request_id: crypto.randomUUID() });

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = undefined;
}

const writeUrl = (request: SearchRequest) => history.replaceState(history.state, '', shareUrl(location.pathname, request, SHARE_HASH));

// aria-busy keeps the live results region quiet while its placeholders swap, so only the outcome is announced.
// Undo waits while a search runs, so a late answer cannot replace the result it brought back.
function setSearching(on: boolean) {
  el.results.classList.toggle('searching', on);
  el.results.setAttribute('aria-busy', String(on));
  el.skippedUndo.hidden = on || !undo.length;
}

// The table stays on the page: before any search it shows the empty state, while one runs its placeholders pulse.
function showPlaceholder(searching: boolean) {
  for (const node of [el.resultsTitle, el.resultsTrip, el.searchAgain, el.resultsEmpty, el.insights, el.appHint, el.more, el.coverage, el.visaNote, el.rating]) {
    node.hidden = true;
  }
  el.routeRows.replaceChildren();
  el.placeholder.hidden = false;
  setSearching(searching);
}

function clearOutcome(searching = false) {
  stopPolling();
  shown = undefined;
  kitRequestId = undefined;
  el.problem.hidden = true;
  el.upsell.hidden = true;
  el.progress.hidden = true;
  showPlaceholder(searching);
}

function showProblem(message: string, retry?: () => void, upsell = false) {
  stopPolling();
  el.progress.hidden = true;
  setSearching(false);
  el.submit.disabled = false;
  el.problemText.textContent = message;
  retryAction = retry;
  el.retry.hidden = !retry;
  el.problem.hidden = false;
  el.upsell.hidden = !upsell || isPro();
}

function renderProgress(view: Pick<SearchView, 'status' | 'done' | 'total' | 'eta_s'>) {
  const pct = view.total ? Math.round((100 * view.done) / view.total) : 0;
  el.progressFill.style.width = `${pct}%`;
  el.progressBar.setAttribute('aria-valuenow', String(pct));
  el.progressStatus.textContent = view.status === 'planning' ? MESSAGES.planning : MESSAGES.fetching;
  const parts = [view.total ? fill(MESSAGES.checks, { done: view.done, total: view.total }) : MESSAGES.starting];
  if (view.eta_s !== null) parts.push(view.eta_s < MINUTE_S ? MESSAGES.etaSoon : fill(MESSAGES.eta, { n: Math.round(view.eta_s / MINUTE_S) }));
  el.progressDetail.textContent = parts.join(' · ');
  el.progress.hidden = false;
}

function renderReconnecting() {
  el.progressStatus.textContent = MESSAGES.reconnecting;
  el.progress.hidden = false;
}

function insightsLine(i: Insights): string {
  const lines: string[] = [];
  if (i.fares_compared && i.days_searched) {
    lines.push(count(MESSAGES.compared, i.days_searched, { fares: countFormat.format(i.fares_compared) }));
  }
  const gains = [
    i.saved_eur != null && fill(MESSAGES.savedLess, { amount: formatMoney(i.saved_eur) }),
    i.early_starts_avoided != null && count(MESSAGES.earlyStarts, i.early_starts_avoided),
    i.sleep_saved_h != null && fill(MESSAGES.sleepGained, { h: countFormat.format(i.sleep_saved_h) }),
    i.hotel_nights_saved != null && count(MESSAGES.lateLandings, i.hotel_nights_saved),
    i.daylight_gained_h != null && fill(MESSAGES.daylightGained, { h: countFormat.format(i.daylight_gained_h) }),
  ].filter((g): g is string => Boolean(g));
  if (gains.length) lines.push(fill(MESSAGES.gains, { list: listOf.format(gains) }));
  return lines.join(' ');
}

function coverageLine(sources: SearchView['sources']): string {
  return sources?.some((s) => s.status !== 'ok') ? MESSAGES.coverage : '';
}

// A one-way trip reads as going to the place it ends in.
function tripLine(r: SearchRequest, template = MESSAGES.trip): string {
  const finish = r.cities.length ? finishOf(r) : [];
  return fill(template, {
    start: nameOf(r.start),
    cities: r.cities.length ? listOf.format(r.cities.map(nameOf)) : anyOf.format(r.ends.map(nameOf)),
    finish: finish.length ? fill(MESSAGES.finishingIn, { name: anyOf.format(finish.map(nameOf)) }) : '',
    from: formatDay(r.date_from),
    to: formatDay(r.date_to),
  });
}

interface RouteContext {
  route: Route;
  request: SearchRequest;
  searched: number;
}

// A finished result's time, or now for one the API sent without it.
const searchedSeconds = (view: Pick<SearchView, 'updated'>) => view.updated ?? Date.now() / 1000;

// The route's own warnings, then its visa flags.
function warnTexts(row: Pick<RouteRow, 'warnings'>, route: Route, request: SearchRequest): string[] {
  return [...row.warnings.map((w) => MESSAGES.warn[w]), ...visaChips(route, request)];
}

function legRows(row: RouteRow, ctx: RouteContext): HTMLElement[] {
  return row.legs.map((leg, i) => {
    const tr = clone('leg-row-template');
    tr.id = `route-${row.rank}-leg-${i}`;
    const raw = ctx.route.legs?.[i];
    if (raw) legExtras(tr, raw, leg, ctx.request);
    setTexts(tr, {
      '.leg-day': leg.day,
      '.leg-time': leg.time,
      '.leg-from': leg.from,
      '.leg-from-code': leg.fromCode,
      '.leg-to': leg.to,
      '.leg-to-code': leg.toCode,
      '.leg-nights': leg.nights ? count(TEXT.nights, leg.nights) : '',
      '.leg-carrier': leg.carrier,
      '.leg-stops': leg.stops ? count(MESSAGES.stops, leg.stops) : MESSAGES.direct,
      '.leg-price': leg.price,
    });
    const book = part<HTMLAnchorElement>(tr, '.book');
    book.replaceWith(...leg.book.map((link) => bookButton(book, link, leg)));
    return tr;
  });
}

type KitPlacement = 'progress' | 'route';

// Links never wait for tracking: the event goes out (or not, without consent) and the browser opens the link.
const tracked = <T extends HTMLElement>(node: T, event: TrackEvent, params: Omit<TrackParams, 'tier'>) => {
  node.addEventListener('click', () => track(event, { ...params, tier: tier() }));
  return node;
};

function bookButton(template: HTMLAnchorElement, link: BookLink, leg: LegRow): HTMLAnchorElement {
  const book = template.cloneNode(true) as HTMLAnchorElement;
  book.href = link.url;
  book.setAttribute('aria-label', fill(MESSAGES.book, { from: leg.from, to: leg.to }));
  return CONTRACT_1_12 ? tracked(book, EVENTS.book, { placement: 'results', kind: link.kind }) : book;
}

function kitGroupItem(group: KitGroup, placement: KitPlacement): HTMLElement {
  const item = clone('kit-group-template');
  part(item, '.kit-kind').textContent = OFFERS.kit[group.kind];
  const links = group.links.map((link) => {
    const a = clone('kit-link-template') as HTMLAnchorElement;
    a.href = link.url;
    a.textContent = link.text || OFFERS.kitOpen;
    return tracked(a, EVENTS.kit, { placement, kind: group.kind });
  });
  part(item, '.kit-links').replaceChildren(...links);
  return item;
}

// "Partner offers": each kind of the Trip kit with its links, labelled by the site, never by the partner.
function kitBlock(groups: KitGroup[], placement: KitPlacement): HTMLElement {
  const block = clone('kit-template');
  part(block, '.kit-list').replaceChildren(...groups.map((group) => kitGroupItem(group, placement)));
  return block;
}

function detailRow(id: string, kind: string, content: HTMLElement): HTMLElement {
  const tr = clone('detail-row-template');
  tr.id = id;
  tr.classList.add(kind);
  part(tr, 'td').append(content);
  return tr;
}

// With 1.12.0 the Pro preview replaces the app hint: one line, under the first route that has one.
function teaserRow(row: RouteRow): HTMLElement {
  const whole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: meta.currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  const line = document.createElement('p');
  line.className = 'pro-teaser';
  line.textContent = fill(OFFERS.proTeaser, { amount: whole.format(row.proSaving!) });
  return detailRow(`route-${row.rank}-teaser`, 'teaser-row', line);
}

let kitRequestId: string | undefined;

// The Trip kit while a search runs: it never delays the search, and an empty or failed answer shows nothing.
async function showProgressKit(request: SearchRequest) {
  const box = el.progressKit;
  if (!box) return;
  kitRequestId = request.client_request_id;
  box.hidden = true;
  const offers = await getTripKit(request.cities, request.date_from, request.date_to).catch(() => []);
  const groups = kitGroups(offers, { name: nameOf, day: formatDay });
  if (kitRequestId !== request.client_request_id || !groups.length) return;
  box.replaceChildren(kitBlock(groups, 'progress'));
  box.hidden = false;
}

function renderRow(row: RouteRow, ctx: RouteContext, teaser = false): HTMLElement[] {
  if (row.kind === 'locked') {
    const tr = clone('locked-row-template');
    setTexts(tr, { '.rank': String(row.rank), '.locked-text': count(MESSAGES.lockedRow, row.nCities), '.total': row.total });
    return [tr];
  }
  const tr = clone('route-row-template');
  setTexts(tr, {
    '.rank': String(row.rank),
    '.route': row.route,
    '.dates': row.dates,
    '.nights': row.nights,
    '.flights': row.flights ? String(row.flights) : '',
    '.total': row.total,
  });
  part(tr, '.warn-chips').replaceChildren(
    ...warnTexts(row, ctx.route, ctx.request).map((text, i) => {
      const chip = clone('warn-template');
      chip.textContent = text;
      // The visa chips follow the route's own warnings; any visa flag brings the visa note.
      chip.classList.toggle('visa-flag', i >= row.warnings.length);
      return chip;
    }),
  );
  const after = teaser ? [teaserRow(row)] : [];
  const legs = legRows(row, ctx);
  const toggle = part<HTMLButtonElement>(tr, '.details-toggle');
  if (!legs.length) {
    toggle.remove();
    return [tr, ...after];
  }
  if (row.kit.length) {
    const kit = detailRow(`route-${row.rank}-kit`, 'kit-row', kitBlock(row.kit, 'route'));
    kit.hidden = true;
    legs.push(kit);
  }
  if (canShare(ctx.route)) {
    const actions = detailRow(`route-${row.rank}-actions`, 'actions-row', routeActions(ctx));
    actions.hidden = true;
    legs.push(actions);
  }
  toggle.setAttribute('aria-controls', legs.map((l) => l.id).join(' '));
  const flip = () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? MESSAGES.hide : MESSAGES.details;
    tr.classList.toggle('open', open);
    for (const leg of legs) leg.hidden = !open;
  };
  toggle.addEventListener('click', flip);
  tr.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('button, a')) flip();
  });
  return [tr, ...legs, ...after];
}

function pushAds() {
  const slots = el.results.querySelectorAll('ins.adsbygoogle');
  if (adsPushed || !slots.length) return;
  adsPushed = true;
  const w = window as unknown as { adsbygoogle?: object[] };
  w.adsbygoogle ??= [];
  for (const _ of slots) w.adsbygoogle.push({});
}

function renderResults(view: SearchView, request: SearchRequest) {
  shown = { view, request };
  const { rows, more } = routeRows(view, { name: nameOf, money: formatMoney, day: formatDay }, CONTRACT_1_12);
  const teaserRank = rows.find((r) => r.proSaving !== undefined)?.rank;
  const searched = searchedSeconds(view);
  showText(el.resultsTitle, rows.length ? count(MESSAGES.found, rows.length) : MESSAGES.none);
  showText(el.resultsTrip, tripLine(request));
  el.searchAgain.hidden = true;
  el.resultsEmpty.hidden = rows.length > 0;
  renderSkipped(request);
  showText(el.insights, view.insights ? insightsLine(view.insights) : '');
  showText(el.appHint, CONTRACT_1_12 ? '' : (appHintLine(view.app_hint, view.routes[0]?.price, formatMoney, TEXT.nudges.appHint) ?? ''));
  el.routeRows.replaceChildren(
    ...rows.flatMap((row) => renderRow(row, { route: view.routes[row.rank - 1], request, searched }, row.rank === teaserRank)),
  );
  part(el.more, 'a').textContent = count(MESSAGES.more, more);
  el.more.hidden = more <= 0;
  showText(el.coverage, coverageLine(view.sources));
  showText(el.visaNote, el.routeRows.querySelector('.visa-flag') ? ACTIONS.visaNote : '');
  renderRating(view.id);

  el.placeholder.hidden = true;
  setSearching(false);
  el.progress.hidden = true;
  el.upsell.hidden = CONTRACT_1_12 ? isPro() : !(more > 0 || rows.some((r) => r.kind !== 'full'));
  el.submit.disabled = false;
  writeUrl(request);
  pushAds();
}

function searchedLine(view: SearchView): string {
  const date = searchedAt(view);
  return date ? fill(MESSAGES.searchedOn, { date: searchedFormat.format(date) }) : '';
}

// A stored result someone shared: shown as it was found, with its time and a way to run it afresh. The time runs on
// after the trip line without the template's closing full stop; the filled line's last one may be a date's ("1. Dez.").
function showShared(view: SearchView, request: SearchRequest) {
  renderResults(view, request);
  const searched = searchedLine(view);
  if (searched) showText(el.resultsTrip, `${tripLine(request, MESSAGES.trip.replace(/\.$/, ''))} · ${searched}`);
  el.searchAgain.hidden = false;
}

// A finished hit is rendered as it is and never polled: after an API restart its id is gone. An identical search
// still running is polled like the visitor's own, but never re-run unasked if it is lost.
async function showLookup(view: SearchView, request: SearchRequest): Promise<void> {
  if (!ACTIVE.includes(view.status)) return showShared(view, request);
  const saved = { id: view.id, request };
  save(saved);
  return resume(saved, true);
}

// Submitting is held while the lookup runs, so a late answer cannot replace a search the visitor just started.
async function openShared(request: SearchRequest): Promise<void> {
  showPlaceholder(true);
  el.submit.disabled = true;
  const outcome = await lookupShared(request);
  if (outcome.kind === 'hit') return showLookup(outcome.view, request);
  el.submit.disabled = false;
  showPlaceholder(false);
}

// Spec 015: what the web adds to a full leg: the connection flag, and Skip this flight while the API takes `excluded`.
function legExtras(tr: HTMLElement, raw: Leg, leg: LegRow, request: SearchRequest) {
  const warn = part(tr, '.leg-warn');
  if (warnsConnection(raw, countryOf)) {
    warn.textContent = ACTIONS.connection;
    warn.classList.add('visa-flag');
    warn.hidden = false;
  }
  const flight = flightOf(raw);
  if (!flight || !allowed.has('excluded') || !isCurrent(request, localToday()) || !canSkip(request.excluded ?? [], flight)) return;
  const menu = part(tr, '.leg-menu');
  const more = part<HTMLButtonElement>(menu, '.leg-more');
  const list = part(menu, '.menu');
  const skip = part<HTMLButtonElement>(menu, '.leg-skip');
  more.setAttribute('aria-label', fill(ACTIONS.legMenu, { from: leg.from, to: leg.to }));
  list.id = `${tr.id}-menu`;
  more.setAttribute('aria-controls', list.id);
  skip.textContent = ACTIONS.skip;
  more.addEventListener('click', () => {
    const open = list.hidden;
    openMenu(menu, open);
    if (open) skip.focus();
  });
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    openMenu(menu, false);
    more.focus();
  });
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (next && !menu.contains(next)) openMenu(menu, false);
  });
  skip.addEventListener('click', () => skipFlight(flight));
  menu.hidden = false;
}

function openMenu(menu: HTMLElement, open: boolean) {
  part(menu, '.menu').hidden = !open;
  part(menu, '.leg-more').setAttribute('aria-expanded', String(open));
}

// A click elsewhere closes an open leg menu, whether or not it moved the focus.
document.addEventListener('pointerdown', (event) => {
  for (const menu of el.routeRows.querySelectorAll<HTMLElement>('.leg-menu:not([hidden])')) {
    if (!menu.contains(event.target as Node)) openMenu(menu, false);
  }
});

// "Visa: <country>" for each country the route stays in that every passport needs a visa for.
function visaChips(route: Route, request: SearchRequest): string[] {
  if (!visaTable || !passports.length) return [];
  return countriesNeedingVisa(visaTable, stayCities(route, request), request.start, countryOf, passports).map((country) =>
    fill(ACTIONS.visa, { country: countryName(country) || country }),
  );
}

const absoluteShareUrl = (request: SearchRequest) => new URL(shareUrl(location.pathname, request, SHARE_HASH), location.origin).href;

function routeActions(ctx: RouteContext): HTMLElement {
  const box = clone('route-actions-template');
  const saveButton = part<HTMLButtonElement>(box, '.route-save');
  const shareButton = part<HTMLButtonElement>(box, '.route-share');
  const status = part(box, '.route-status');
  const key = routeKey(ctx.route);
  const paint = () => {
    const saved = library.isSaved(key);
    saveButton.textContent = saved ? ACTIONS.saved : ACTIONS.save;
    saveButton.setAttribute('aria-pressed', String(saved));
  };
  paint();
  saveButton.addEventListener('click', () => {
    status.textContent = '';
    const entry: SavedRoute = { key, route: ctx.route, request: ctx.request, currency: meta.currency, searched: ctx.searched, saved: Date.now() / 1000 };
    const ok = library.isSaved(key) ? library.unsave(key) : library.save(entry);
    if (!ok) status.textContent = ACTIONS.saveFailed;
    paint();
  });
  shareButton.textContent = ACTIONS.share;
  shareButton.addEventListener('click', () => void shareRoute(ctx, status));
  return box;
}

const shareFormat = () => ({
  name: nameOf,
  money: formatMoney,
  day: formatDay,
  date: (date: Date) => searchedFormat.format(date),
  nights: (n: number) => count(TEXT.nights, n),
  header: ACTIONS.shareHeader,
  checked: ACTIONS.pricesChecked,
});

// The system share sheet with the link and the itinerary; without one, both go to the clipboard.
async function shareRoute(ctx: RouteContext, status: HTMLElement) {
  status.textContent = '';
  const text = shareText(ctx.route, ctx.searched, shareFormat());
  const url = absoluteShareUrl(ctx.request);
  try {
    if (navigator.share) return await navigator.share({ text, url });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(withLink(text, url));
    status.textContent = ACTIONS.copied;
  } catch {
    // Nothing to copy to: the address bar still holds the link.
  }
}

const flightText = (f: ExcludedFlight) => [`${f.origin} → ${f.dest}`, formatDay(f.day), f.dep].filter(Boolean).join(' · ');

// The flights skipped on this result, never by the fare source the API names them with.
function renderSkipped(request: SearchRequest) {
  const skipped = request.excluded ?? [];
  el.skipped.hidden = !skipped.length;
  el.skippedLabel.textContent = ACTIONS.skipped;
  el.skippedList.replaceChildren(
    ...skipped.map((flight) => {
      const item = document.createElement('li');
      item.textContent = flightText(flight);
      return item;
    }),
  );
  el.skippedUndo.textContent = ACTIONS.undo;
}

function skipFlight(flight: ExcludedFlight) {
  if (!shown) return;
  undo.push(shown);
  const request = { ...withNewRequestId(shown.request), excluded: [...(shown.request.excluded ?? []), flight] };
  void submit(request);
}

// The result before the last skipped flight, from the page: no search is spent.
function undoSkip() {
  const before = undo.pop();
  if (!before) return;
  clearOutcome();
  el.submit.disabled = false;
  // A saved route's view has no search id to come back to after a reload.
  if (before.view.id) save({ id: before.view.id, request: before.request, finished: true });
  else forget();
  renderResults(before.view, before.request);
}

const dismissedRatings = new Set<string>();
const ratedHere = new Map<string, number>();
let ratingId = '';

function paintRating(stars: number | undefined) {
  const settled = stars !== undefined;
  for (const star of el.ratingStars.querySelectorAll<HTMLButtonElement>('[data-stars]')) {
    const n = Number(star.dataset.stars);
    star.setAttribute('aria-label', count(SHELF.star, n));
    star.setAttribute('aria-pressed', String(settled && n <= stars));
    star.disabled = settled;
  }
  el.ratingTitle.hidden = settled;
  el.ratingThanks.hidden = !settled;
  el.ratingSupport.hidden = !settled || stars > LIBRARY.lowStars;
  el.ratingDismiss.hidden = settled;
}

// Inline under a finished result, never modal; a rating is settled once given.
function renderRating(id: string) {
  ratingId = id;
  el.rating.hidden = !id || dismissedRatings.has(id);
  if (id) paintRating(ratedHere.get(id) ?? library.rating(id));
}

function rate(stars: number) {
  if (!ratingId || ratedHere.has(ratingId) || library.rating(ratingId) !== undefined) return;
  ratedHere.set(ratingId, stars);
  library.rate(ratingId, stars);
  track(EVENTS.rate, { placement: 'results', kind: 'stars', tier: tier(), value: stars });
  paintRating(stars);
}

const finishedOf = ({ id, routes, more_routes, insights, sources, updated }: SearchView): Finished => ({ id, routes, more_routes, insights, sources, updated });

function remember(view: SearchView, request: SearchRequest) {
  const entry: HistoryEntry = { key: searchKey(request), request, view: finishedOf(view), currency: meta.currency, searched: searchedSeconds(view) };
  historyFailed = !library.record(entry);
}

function resume(saved: Saved, resubmitted = false): Promise<void> {
  clearOutcome(true);
  el.submit.disabled = true;
  renderReconnecting();
  if (CONTRACT_1_12) void showProgressKit(saved.request);
  return poll(saved, resubmitted);
}

async function poll(saved: Saved, resubmitted: boolean, failures = 0): Promise<void> {
  const searchAgain = () => submit(withNewRequestId(saved.request));
  let view: SearchView;
  try {
    view = await getSearch(saved.id);
  } catch (err) {
    if (!(err instanceof NotFound)) {
      if (failures >= WEB_SEARCH.pollRetries) return showProblem(MESSAGES.network, () => resume(saved, resubmitted));
      renderReconnecting();
      pollTimer = setTimeout(() => poll(saved, resubmitted, failures + 1), WEB_SEARCH.pollRetryBaseMs * 2 ** failures);
      return;
    }
    // A stored result first; then resubmit unasked only a search lost mid-run (an API restart): never spend a
    // free search re-running one already shown, nor one whose dates have passed.
    const current = isCurrent(saved.request, localToday());
    if (canLookup(saved.request, localToday())) {
      const shared = await lookupShared(saved.request);
      const lostAgain = shared.kind === 'hit' && ACTIVE.includes(shared.view.status) && shared.view.id === saved.id;
      if (shared.kind === 'hit' && !lostAgain) {
        // Drop the lost id: a finished hit is not saved, so a reload looks the trip up again.
        forget();
        return showLookup(shared.view, saved.request);
      }
    }
    if (!resubmitted && !saved.finished && current) return submit(saved.request, true);
    return showProblem(MESSAGES.expired, current ? searchAgain : undefined);
  }
  if (ACTIVE.includes(view.status)) {
    renderProgress(view);
    pollTimer = setTimeout(() => poll(saved, resubmitted), WEB_SEARCH.pollMs);
    return;
  }
  const firstSeen = !saved.finished;
  save({ ...saved, finished: true });
  if (view.status === 'failed') return showProblem(MESSAGES.failed, searchAgain);
  if (firstSeen) {
    routesReady({ Notification: globalThis.Notification, doc: document, focus: () => window.focus(), text: TEXT.notify });
    remember(view, saved.request);
  }
  renderResults(view, saved.request);
}

async function submit(asked: SearchRequest, resubmitted = false): Promise<void> {
  const request = allowedOnly(asked, allowed);
  const retry = () => submit(request, resubmitted);
  clearOutcome(true);
  renderSkipped(request);
  writeUrl(request);
  el.submit.disabled = true;
  renderProgress({ status: 'fetching', done: 0, total: 0, eta_s: null });

  let outcome: SubmitOutcome;
  try {
    outcome = await createSearch(request);
  } catch {
    return showProblem(MESSAGES.network, retry);
  }

  switch (outcome.kind) {
    case 'created': {
      if (meta.free_searches_left) meta.free_searches_left -= 1;
      renderQuota();
      if (CONTRACT_1_12) void showProgressKit(request);
      const saved = { id: outcome.id, request };
      save(saved);
      return poll(saved, resubmitted);
    }
    case 'quota':
      meta.free_searches_left = 0;
      renderQuota();
      return showProblem(quotaSpent(meta, MESSAGES, LOCALE), undefined, true);
    case 'city_limit':
      return showProblem(cityLimitLine(), undefined, true);
    case 'invalid':
      return showProblem(MESSAGES.invalid);
    case 'app_only':
      // A /meta that let a field through the API now refuses: it stays out of every later request, the form keeps it.
      if (outcome.field && (OPTION_FIELDS as readonly string[]).includes(outcome.field)) {
        refused.add(outcome.field);
        applyGate();
        return showProblem(MESSAGES.appOnly);
      }
      return showProblem(MESSAGES.appOnly, undefined, true);
    case 'busy':
      return showProblem(MESSAGES.busy, retry);
    case 'web_unavailable':
      return showProblem(MESSAGES.webUnavailable, retry, true);
    case 'error':
      return showProblem(MESSAGES.network, retry);
  }
}

// Spec 015: the trip type, as the app's SearchFormModel. Round trip and one way take one place to go; switching keeps
// From, the first city or the place to go, and the window, and multi-city comes back with its own lists.
function setTripType(type: TripType) {
  tripType = type;
  for (const button of el.tripTypes) button.setAttribute('aria-pressed', String(button.dataset.tripType === type));
  el.backField.hidden = type !== 'multi';
  el.citiesField.hidden = type !== 'multi';
  el.toField.hidden = type === 'multi';
  el.nightsField.hidden = type === 'oneway';
  el.fields.dataset.trip = type;
  renderList('cities');
}

function chooseTripType(type: TripType) {
  if (type === tripType) return;
  if (tripType === 'multi' && !destination && lists.cities[0]) setDestination(lists.cities[0]);
  if (type === 'multi' && !lists.cities.length && destination && destination !== pickedFrom) lists.cities = [destination];
  setTripType(type);
}

function setDestination(code: string | undefined) {
  destination = code;
  el.to.value = code ? nameOf(code) : '';
  renderPlaceOptions();
}

const countryOf = (code: string) => byCode.get(code)?.country;

function setOptions(next: TripOptions) {
  options = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
  renderOptions();
}

// Each control shows while the API takes its field (allowedFields); a locked chip shows while it does not.
function applyGate() {
  allowed = allowedFields(meta, CONTRACT_1_12, refused);
  const on = (fields: string | undefined) => (fields ?? '').split(' ').some((field) => allowed.has(field as OptionField));
  for (const node of el.options.querySelectorAll<HTMLElement>('[data-any]')) node.hidden = !on(node.dataset.any);
  for (const node of el.options.querySelectorAll<HTMLElement>('[data-field]')) node.hidden = !on(node.dataset.field);
  for (const node of el.form.querySelectorAll<HTMLElement>('[data-locked-field]')) node.hidden = on(node.dataset.lockedField);
  const anyChip = [...el.lockedChips.children].some((chip) => !(chip as HTMLElement).hidden);
  el.inAppLabel.hidden = !anyChip;
  el.lockedChips.hidden = !anyChip;
  renderList('cities');
  renderOptions();
}

function renderOptions() {
  const party = options.travellers ?? ONE_ADULT;
  for (const stepper of el.options.querySelectorAll<HTMLElement>('[data-traveller]')) {
    const kind = stepper.dataset.traveller as TravellerKind;
    const { min, max } = travellerRange(party, kind);
    part<HTMLOutputElement>(stepper, 'output').value = String(party[kind]);
    limitStepper(stepper, party[kind] <= min, party[kind] >= max);
  }
  const priority = options.priority ?? meta?.default_priority;
  for (const button of el.options.querySelectorAll<HTMLButtonElement>('[data-priority]')) {
    button.hidden = !meta?.priorities?.[button.dataset.priority!];
    button.setAttribute('aria-pressed', String(button.dataset.priority === priority));
  }
  const direct = options.max_stops_per_leg === 0;
  el.directOnly.setAttribute('aria-pressed', String(direct));
  el.connections.hidden = direct || !allowed.has('max_stops_total');
  const total = options.max_stops_total;
  el.connectionsCount.value = total === undefined ? OPTIONS.any : String(total);
  limitStepper(el.connections, total === 0, total === undefined);
  takeoffList.render();
  landingList.render();
  renderPlaceOptions();
}

// Must or maybe on a city's chip: maybe cities go in `optional`, and a pinned city is always a must.
function maybeToggle(chip: HTMLElement, code: string) {
  const toggle = part<HTMLButtonElement>(chip, '.chip-mode');
  toggle.hidden = !allowed.has('optional') || tripType !== 'multi';
  if (toggle.hidden) return;
  const maybe = options.optional?.includes(code) ?? false;
  toggle.textContent = maybe ? OPTIONS.maybe : OPTIONS.must;
  toggle.setAttribute('aria-pressed', String(maybe));
  toggle.setAttribute('aria-label', fill(OPTIONS.maybeOf, { name: nameOf(code) }));
  toggle.disabled = Boolean(options.pinned?.some((pin) => pin.city === code));
  toggle.dataset.city = code;
  chip.classList.toggle('maybe', maybe);
  toggle.addEventListener('click', () => {
    const optional = options.optional ?? [];
    setOptions({ ...options, optional: maybe ? optional.filter((city) => city !== code) : [...optional, code] });
    renderList('cities');
    refocus(el.cities, (button) => button.dataset.city === code);
  });
}

interface PlaceRow {
  row: HTMLElement;
  pin: RangePicker;
}

// One row per place, kept while the page lives, so each city's date pin keeps its own calendar.
const placeRows = new Map<string, PlaceRow>();

function placeRow(code: string): PlaceRow {
  const known = placeRows.get(code);
  if (known) return known;
  const row = clone('place-option-row-template');
  const id = `place-option-${placeRows.size}`;
  const name = part(row, '.place-option-name');
  name.id = `${id}-name`;
  const trigger = part<HTMLButtonElement>(row, '.pin-picker');
  const label = part(row, '.pin-text');
  label.id = `${id}-pin`;
  const dialog = part(row, '.calendar');
  dialog.id = `${id}-calendar`;
  dialog.setAttribute('aria-labelledby', name.id);
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.setAttribute('aria-labelledby', `${name.id} ${label.id}`);
  const pin = new RangePicker({
    trigger,
    label,
    dialog,
    months: part(row, '.cal-months'),
    prev: part<HTMLButtonElement>(row, '.cal-prev'),
    next: part<HTMLButtonElement>(row, '.cal-next'),
    maxDays: () => Math.max(0, nights.max - 1),
    format: pinLabel,
    locale: LOCALE,
    bounds: () => pinBounds(picker.range.from, picker.range.to),
    sameDay: true,
    onPick: ({ from, to }) => setPin(code, from, to),
  });
  part(row, '.pin-remove').addEventListener('click', () => {
    setOptions({ ...options, pinned: (options.pinned ?? []).filter((p) => p.city !== code) });
    renderList('cities');
    trigger.focus();
  });
  const entry = { row, pin };
  placeRows.set(code, entry);
  return entry;
}

// A pin reads as one day or a range of days; no pin reads as any day.
function pinLabel({ from, to }: { from: string; to: string }): string {
  if (!from) return OPTIONS.anyDay;
  if (to && to !== from) return formatDays(from, to);
  return formatDay(from);
}

// A pinned city is a must; the API takes a few pins per trip, one per city.
function setPin(city: string, from: string, to: string) {
  const others = (options.pinned ?? []).filter((p) => p.city !== city && lists.cities.includes(p.city));
  if (others.length >= REQUEST_LIMITS.pins) return;
  setOptions({ ...options, pinned: [...others, makePin(city, from, to)], optional: options.optional?.filter((c) => c !== city) });
  renderList('cities');
}

function airportToggle(city: string, cityName: string, airport: string, pressed: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'segment airport';
  button.textContent = airport;
  button.dataset.city = city;
  button.dataset.airport = airport;
  button.setAttribute('aria-pressed', String(pressed));
  button.setAttribute('aria-label', fill(OPTIONS.airportOf, { name: cityName, code: airport }));
  return button;
}

const tripPlaces = () =>
  [...new Set([pickedFrom, ...(tripType === 'multi' ? [...lists.ends, ...lists.cities] : [destination])].filter(isText))];

function renderPlaceOptions() {
  const pinsOn = allowed.has('pinned') && tripType === 'multi';
  const pins = (options.pinned ?? []).filter((p) => lists.cities.includes(p.city));
  const rows = tripPlaces().flatMap((code) => {
    const all = airportsOfPlace(code);
    const pinnable = pinsOn && lists.cities.includes(code);
    const choice = allowed.has('airports') && all.length > 1;
    if (!pinnable && !choice) return [];
    const { row, pin } = placeRow(code);
    const name = nameOf(code);
    part(row, '.place-option-name').textContent = name;
    const pinned = pins.find((p) => p.city === code);
    part(row, '.pin').hidden = !pinnable;
    pin.set({ from: pinned?.date_from ?? '', to: pinned ? lastDay(pinned) : '' });
    part<HTMLButtonElement>(row, '.pin-picker').disabled = !pinned && pins.length >= REQUEST_LIMITS.pins;
    const remove = part<HTMLButtonElement>(row, '.pin-remove');
    remove.hidden = !pinned;
    remove.setAttribute('aria-label', fill(OPTIONS.removePin, { name }));
    const toggles = part(row, '.airport-toggles');
    toggles.hidden = !choice;
    const chosen = options.airports?.[code] ?? all;
    toggles.replaceChildren(...(choice ? all : []).map((airport) => airportToggle(code, name, airport, chosen.includes(airport))));
    return [row];
  });
  el.placeOptions.replaceChildren(...rows);
  el.placesOption.hidden = !rows.length;
}

const hours = () => options.schedule ?? API_HOURS;
const clockFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const clockLabel = (clock: string) => clockFormat.format(new Date(minutesOf(clock) * MINUTE_S * 1000));

const takeoffList = new TimeList({
  button: el.takeoff,
  list: el.takeoffList,
  choices: () => takeoffChoices(hours().short_to),
  value: () => hours().short_from,
  label: clockLabel,
  onPick: (clock) => setOptions({ ...options, schedule: { ...hours(), short_from: clock } }),
});
const landingList = new TimeList({
  button: el.landing,
  list: el.landingList,
  choices: () => landingChoices(hours().short_from),
  value: () => hours().short_to,
  label: clockLabel,
  onPick: (clock) => setOptions({ ...options, schedule: { ...hours(), short_to: clock } }),
});

// Passports never leave the browser; the visa table loads only once one is set.
function renderPassports() {
  el.passports.replaceChildren(
    ...passports.map((code) => {
      const chip = clone('chip-template');
      const name = countryName(code) || code;
      part(chip, '.chip-name').textContent = name;
      const remove = part<HTMLButtonElement>(chip, '.chip-remove');
      remove.setAttribute('aria-label', fill(MESSAGES.removeCity, { name }));
      remove.addEventListener('click', () => {
        setPassports(passports.filter((other) => other !== code));
        el.passport.focus();
      });
      return chip;
    }),
  );
}

function setPassports(next: string[]) {
  passports = [...new Set(next)].sort();
  library.setPassports(passports);
  renderPassports();
  void loadVisa();
  redrawResults();
}

async function loadVisa() {
  if (visaAsked || !passports.length) return;
  visaAsked = true;
  try {
    const res = await fetch(VISA.url);
    visaTable = res.ok ? readTable(await res.json()) : undefined;
  } catch {
    visaTable = undefined;
  }
  if (!visaTable) visaAsked = false;
  else redrawResults();
}

function redrawResults() {
  if (shown) renderResults(shown.view, shown.request);
}

const passportBox = new Combobox<string>({
  input: el.passport,
  list: el.passportList,
  options: (query) => matchPassports(query, countryName, passports, WEB_SEARCH.placeMatches),
  renderOption: (code) => {
    const row = clone('place-option-template');
    part(row, '.place-local').textContent = countryName(code) || code;
    for (const selector of ['.place-alt', '.place-native', '.place-country', '.place-airports']) part(row, selector).hidden = true;
    part(row, '.place-code').textContent = code;
    return row;
  },
  renderNotice: placeNotice,
  onPick: (code) => {
    el.passport.value = '';
    setPassports([...passports, code]);
  },
});

// Your trips: saved routes (compare two or three) and recent searches, each kept whole so it opens after it expires.
let comparing: string[] = [];
const HISTORY_EMPTY = el.historyEmpty.textContent ?? '';

const moneyIn = (amount: number, currency: string) => new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(amount);
const routeText = (route: Route) => routePlaces(route).map(nameOf).join(' → ');

// A removed row takes its focus with it; the sheet's Close keeps it inside the sheet.
function libraryRow(text: string, metaText: string, onOpen: () => void, onRemove: () => void): HTMLElement {
  const row = clone('library-row-template');
  setTexts(row, { '.library-route': text, '.library-meta': metaText, '.library-open': SHELF.open, '.library-remove': SHELF.remove });
  part(row, '.library-open').addEventListener('click', onOpen);
  part(row, '.library-remove').addEventListener('click', () => {
    onRemove();
    el.libraryClose.focus();
  });
  return row;
}

// Trip type and party set apart searches whose cities and dates match, in the labels the form already shows.
function historyMeta(entry: HistoryEntry): string {
  const labelOf = (selector: string) => document.querySelector(selector)?.textContent ?? '';
  const travellers = entry.request.travellers;
  const party = travellers ? TRAVELLER_KINDS.filter((kind) => travellers[kind]).map((kind) => `${labelOf(`#${kind}-label`)} ${travellers[kind]}`) : [];
  const searched = fill(MESSAGES.searchedOn, { date: searchedFormat.format(new Date(entry.searched * 1000)) });
  return [labelOf(`[data-trip-type="${tripTypeOf(entry.request)}"]`), ...party, searched].filter(Boolean).join(' · ');
}

const savedRouteView = (entry: SavedRoute): Finished => ({ id: '', routes: [entry.route], more_routes: 0, updated: entry.searched });

function savedRow(entry: SavedRoute, several: boolean): HTMLElement {
  const days = (entry.route.legs ?? []).map((leg) => leg.day).filter(isText);
  const dates = days.length ? formatDays(days[0], days[days.length - 1]) : '';
  const metaText = [dates, moneyIn(entry.route.price, entry.currency)].filter(Boolean).join(' · ');
  const row = libraryRow(routeText(entry.route), metaText, () => openStored(savedRouteView(entry), entry.request), () => {
    library.unsave(entry.key);
    comparing = comparing.filter((key) => key !== entry.key);
    renderLibrary();
  });
  const compare = part<HTMLButtonElement>(row, '.library-compare');
  compare.hidden = !several;
  compare.textContent = SHELF.compare;
  compare.dataset.key = entry.key;
  compare.setAttribute('aria-pressed', String(comparing.includes(entry.key)));
  compare.disabled = !comparing.includes(entry.key) && comparing.length >= LIBRARY.compareMax;
  compare.addEventListener('click', () => {
    comparing = toggleCompare(comparing, entry.key);
    renderLibrary();
    refocus(el.savedList, (button) => button.dataset.key === entry.key);
  });
  return row;
}

function compareTable(entries: SavedRoute[]) {
  const cells = (label: string, values: string[]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    tr.append(th, ...values.map((value) => Object.assign(document.createElement('td'), { textContent: value })));
    return tr;
  };
  const rows = entries.map((entry) => routeRows({ routes: [entry.route] }, { name: nameOf, money: (n) => moneyIn(n, entry.currency), day: formatDay }).rows[0]);
  const warnings = entries.map((entry, i) => warnTexts(rows[i], entry.route, entry.request).join(', '));
  el.compareRows.replaceChildren(
    cells(TEXT.columns.route, rows.map((row) => row.route)),
    cells(TEXT.columns.dates, rows.map((row) => row.dates)),
    cells(TEXT.columns.nights, rows.map((row) => row.nights)),
    cells(TEXT.columns.flights, rows.map((row) => (row.flights ? String(row.flights) : ''))),
    cells(TEXT.columns.warn, warnings),
    cells(TEXT.columns.total, rows.map((row) => row.total)),
  );
}

function renderLibrary() {
  const saved = library.saved();
  comparing = comparing.filter((key) => saved.some((entry) => entry.key === key));
  const several = saved.length >= LIBRARY.compareMin;
  el.savedEmpty.hidden = saved.length > 0;
  showText(el.compareHint, several ? fill(SHELF.comparePick, { min: LIBRARY.compareMin, max: LIBRARY.compareMax }) : '');
  el.savedList.replaceChildren(...saved.map((entry) => savedRow(entry, several)));
  const compared = saved.filter((entry) => comparing.includes(entry.key));
  el.compare.hidden = !canCompare(comparing);
  if (!el.compare.hidden) {
    el.compareTitle.textContent = count(SHELF.compareTitle, compared.length);
    compareTable(compared);
  }
  const history = library.history();
  el.historyEmpty.textContent = historyFailed && !history.length ? ACTIONS.saveFailed : HISTORY_EMPTY;
  el.historyEmpty.hidden = history.length > 0;
  el.historyList.replaceChildren(
    ...history.map((entry) =>
      libraryRow(tripLine(entry.request), historyMeta(entry), () => openStored(entry.view, entry.request), () => {
        library.forget(entry.key);
        renderLibrary();
      }),
    ),
  );
}

// A kept route or search, shown as it was found with its time and Search again, never polled.
function openStored(view: Finished, request: SearchRequest) {
  el.librarySheet.close();
  clearOutcome();
  undo.length = 0;
  fillForm(request);
  showShared({ status: 'done', done: 0, total: 0, eta_s: null, ...view }, request);
  el.results.scrollIntoView({ block: 'start' });
}

// The strip starts on the tip after the last page view's, then rotates while it is on screen and unattended.
function setupStrip(cookies: Map<string, string>) {
  const tips = TEXT.nudges.rotation;
  const { index, next } = rotation(cookies.get(PREFS.nudge.cookie), tips.length);
  document.cookie = cookieString(PREFS.nudge, String(next));
  const dots = [...el.nudgeDots.querySelectorAll<HTMLButtonElement>('button')];
  el.nudgeDots.hidden = false;
  const paint = (i: number) => {
    el.nudge.textContent = tips[i];
    dots.forEach((dot, j) => {
      if (j === i) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };
  paint(index);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ticker = new Ticker({
    count: tips.length,
    intervalMs: WEB_SEARCH.nudgeMs,
    reducedMotion: reduced,
    start: index,
    onChange: (i, manual) => {
      if (manual) el.nudge.setAttribute('aria-live', 'polite');
      paint(i);
      el.nudge.classList.remove('swap');
      // Reading the layout between remove and add restarts the swap animation.
      void el.nudge.offsetWidth;
      el.nudge.classList.add('swap');
    },
  });
  ticker.pause('offscreen');
  el.nudgeDots.addEventListener('click', (event) => {
    const dot = (event.target as Element).closest<HTMLButtonElement>('[data-tip]');
    if (dot) ticker.show(Number(dot.dataset.tip));
  });
  el.strip.addEventListener('mouseenter', () => ticker.pause('hover'));
  el.strip.addEventListener('mouseleave', () => ticker.resume('hover'));
  el.strip.addEventListener('focusin', () => ticker.pause('focus'));
  el.strip.addEventListener('focusout', (event) => {
    if (!el.strip.contains(event.relatedTarget as Node | null)) ticker.resume('focus');
  });
  const onVisibility = () => (document.hidden ? ticker.pause('hidden') : ticker.resume('hidden'));
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  if (!('IntersectionObserver' in window)) return ticker.resume('offscreen');
  if (!reduced) el.strip.classList.add('pending');
  new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return ticker.pause('offscreen');
      el.strip.classList.remove('pending');
      ticker.resume('offscreen');
    },
    { threshold: 0.5 },
  ).observe(el.strip);
}

const cityBox = placeBox(
  el.city,
  el.cityList,
  () => taken('cities'),
  (p) => addTo('cities', p.code),
  () => (lists.cities.length >= maxCities() && !isPro() ? TEXT.nudges.cityCap : undefined),
);
placeBox(el.from, el.fromList, () => lists.cities, (p) => {
  setFrom(p.code);
  remembered('from', false);
});
placeBox(el.back, el.backList, () => taken('ends'), (p) => addTo('ends', p.code));
placeBox(el.to, el.toList, () => [pickedFrom], (p) => setDestination(p.code));
boxes.set(el.passport, passportBox);

el.from.addEventListener('input', () => {
  pickedFrom = undefined;
  remembered('from', false);
});
el.from.addEventListener('change', () => {
  const code = pickedFrom ?? resolvePlace(el.from.value);
  if (code) setFrom(code);
  else renderPlaceOptions();
});
el.to.addEventListener('input', () => {
  destination = undefined;
});
el.to.addEventListener('change', () => {
  const code = destination ?? resolvePlace(el.to.value);
  if (code) setDestination(code);
});
// Only the single field takes its text as the pick; a chip list adds on a pick, so leaving it never adds a chip.
el.back.addEventListener('input', () => {
  if (severalEnds()) return;
  lists.ends = [];
  remembered('back', false);
});
el.back.addEventListener('change', () => {
  if (severalEnds() || lists.ends.length) return;
  const code = resolvePlace(el.back.value);
  if (code) addTo('ends', code);
});

el.city.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  event.preventDefault();
  if (!el.city.value.trim() || !places.length) return;
  const code = resolvePlace(el.city.value);
  if (code) {
    addTo('cities', code);
    cityBox.close();
  } else {
    el.formError.textContent = MESSAGES.pickCity;
  }
});

el.fields.addEventListener('click', (event) => {
  const target = event.target as Element;
  const clear = target.closest('.combo-clear');
  if (clear) {
    const input = part<HTMLInputElement>(clear.closest('.combo')!, 'input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    boxes.get(input)?.close();
    return;
  }
  const step = target.closest<HTMLButtonElement>('[data-step]');
  if (step) return stepped(step);
  const type = target.closest<HTMLButtonElement>('[data-trip-type]')?.dataset.tripType;
  if (type) return chooseTripType(type as TripType);
  const priority = target.closest<HTMLButtonElement>('[data-priority]')?.dataset.priority;
  if (priority) return setOptions({ ...options, priority: priority === meta.default_priority ? undefined : priority });
  if (target.closest('#direct-only')) {
    const direct = options.max_stops_per_leg !== 0;
    return setOptions({ ...options, max_stops_per_leg: direct ? 0 : undefined, max_stops_total: direct ? undefined : options.max_stops_total });
  }
  const airport = target.closest<HTMLButtonElement>('[data-airport]');
  if (airport) {
    const { city, airport: code } = airport.dataset as { city: string; airport: string };
    setOptions({ ...options, airports: toggleAirport(options.airports ?? {}, city, code, airportsOfPlace(city)) });
    return refocus(el.placeOptions, (button) => button.dataset.city === city && button.dataset.airport === code);
  }
  if (target.closest('#options-toggle')) {
    el.options.hidden = !el.options.hidden;
    el.optionsToggle.setAttribute('aria-expanded', String(!el.options.hidden));
    return;
  }
  if (target.closest('#library-open')) {
    renderLibrary();
    el.librarySheet.showModal();
    return;
  }
  const chip = target.closest<HTMLButtonElement>('.locked-chip');
  if (!chip) return;
  const pressed = chip.getAttribute('aria-pressed') !== 'true';
  for (const other of el.fields.querySelectorAll('.locked-chip')) other.setAttribute('aria-pressed', 'false');
  chip.setAttribute('aria-pressed', String(pressed));
  showText(el.chipNudge, pressed ? (chip.dataset.nudge ?? '') : '');
});

function stepped(step: HTMLButtonElement) {
  const delta = Number(step.dataset.step);
  const night = step.closest<HTMLElement>('[data-nights]');
  const traveller = step.closest<HTMLElement>('[data-traveller]');
  if (night) {
    nights = stepNights(nights, night.dataset.nights as keyof Nights, delta, meta.limits.max_nights);
    renderNights();
  } else if (traveller) {
    setOptions({ ...options, travellers: stepTravellers(options.travellers ?? ONE_ADULT, traveller.dataset.traveller as TravellerKind, delta) });
  } else if (step.closest('[data-connections]')) {
    setOptions({ ...options, max_stops_total: stepConnections(options.max_stops_total, delta > 0) });
  }
}

// Only a multi-city trip is remembered whole; the other trip types keep where you start.
const tripCookies = (trip: Trip) => (tripType === 'multi' ? savedCookies(trip) : [cookieString(PREFS.from, trip.start)]);

el.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const trip = readForm();
  if (typeof trip === 'string') {
    el.formError.textContent = trip;
    return;
  }
  el.formError.textContent = '';
  for (const cookie of tripCookies(trip)) document.cookie = cookie;
  el.notifyAsk.hidden = askedToNotify || !canAsk(globalThis.Notification);
  undo.length = 0;
  void submit(buildRequest(trip, crypto.randomUUID(), allowed));
  el.progress.scrollIntoView({ block: 'start' });
});

el.form.addEventListener('input', () => {
  el.formError.textContent = '';
});

el.retry.addEventListener('click', () => retryAction?.());

el.skippedUndo.addEventListener('click', undoSkip);

el.libraryClose.addEventListener('click', () => el.librarySheet.close());

el.ratingStars.addEventListener('click', (event) => {
  const star = (event.target as Element).closest<HTMLButtonElement>('[data-stars]');
  if (star) rate(Number(star.dataset.stars));
});

el.ratingDismiss.addEventListener('click', () => {
  dismissedRatings.add(ratingId);
  el.rating.hidden = true;
});

el.searchAgain.addEventListener('click', () => el.form.requestSubmit());

function closeNotifyAsk() {
  askedToNotify = true;
  el.notifyAsk.hidden = true;
}

el.notifyYes.addEventListener('click', () => {
  closeNotifyAsk();
  void ask(globalThis.Notification);
});

el.notifyNo.addEventListener('click', closeNotifyAsk);

// The fields open before /meta answers, on the bundled limits; searching waits for it. The places are the stored
// ones, else the static list, loaded on the first focus in the form or once the page is idle. Only a link or a cookie
// that names places waits for that list, to read them.
async function openForm(): Promise<Prefs> {
  useMeta(provisionalMeta());
  const cookies = parseCookies(document.cookie);
  if (namesPlaces(new URLSearchParams(location.search), cookies)) await loadPlaces();
  const prefs = setupForm(cookies);
  el.loading.hidden = true;
  el.fields.disabled = false;
  el.submit.disabled = true;
  return prefs;
}

function loadPlacesWhenIdle() {
  const idle = () => (window.requestIdleCallback ?? setTimeout)(() => void loadPlaces());
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

async function init(prefs: Prefs, metaAnswer = getMeta()): Promise<void> {
  clearOutcome();
  try {
    applyMeta(await metaAnswer);
  } catch {
    showProblem(MESSAGES.metaDown, () => void init(prefs));
    el.submit.disabled = true;
    return;
  }
  el.submit.disabled = false;
  metaLive = true;
  renderAccount();
  // Not before the places are asked for: checking the version reads the stored list, a parse kept off page start.
  void askedForPlaces.then(() => placesStore.refresh(meta)).then(usePlaces);

  // A shared link names the whole trip: the session's own search wins only when it is that same trip. A link
  // whose trip has started only pre-fills the places and nights; setupForm skips its past dates.
  const shared = sharedRequest(prefs, crypto.randomUUID());
  const saved = load();
  if (saved && (!shared || sameSearch(saved.request, shared))) {
    fillForm(saved.request);
    return resume(saved);
  }
  if (!shared || !canLookup(shared, localToday())) return;
  fillForm(shared);
  return openShared(shared);
}

// Sign-in (spec 014): signing in or out asks /meta again, and applyMeta redraws the caps for the new tier.
let metaLive = false;
let signedOutLine = false;
const account = SIGN_IN ? setupAccount(TEXT.account!, (change) => void accountChanged(change)) : undefined;
const renderAccount = () => account?.render(isPro(), signedOutLine);

async function accountChanged(change: Change) {
  signedOutLine = change === 'expired';
  renderAccount();
  if (!metaLive) return;
  try {
    applyMeta(await getMeta());
  } catch {
    // The caps shown stay until the next /meta.
  }
  renderAccount();
}

glideLinks('search');
glideLinks('account-status');
setupStrip(parseCookies(document.cookie));
picker.set(defaultWindow());
passports = library.passports();
renderPassports();
void loadVisa();
el.fields.addEventListener('focusin', () => void loadPlaces());
loadPlacesWhenIdle();
setCaller(account?.auth);
const firstMeta = account ? account.resume().then(getMeta) : getMeta();
firstMeta.catch(() => undefined);
void openForm().then((prefs) => init(prefs, firstMeta));
