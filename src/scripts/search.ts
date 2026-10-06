import { PREFS, WEB_SEARCH } from '../app';
import type { Dict } from '../i18n';
import { fill, plural, type Plural, type Vars } from '../i18n/text';
import { RangePicker, addDays, daysBetween, localToday, stepNights, type Nights } from './calendar';
import { Combobox, matchPlaces } from './combobox';
import {
  ACTIVE,
  NotFound,
  buildRequest,
  canLookup,
  createSearch,
  endLimit,
  getMeta,
  getSearch,
  lookupShared,
  searchedAt,
  type Insights,
  type Meta,
  type Place,
  type SearchRequest,
  type SearchView,
  type SubmitOutcome,
  type Trip,
} from './ffly-api';
import { ask, canAsk, routesReady } from './notify';
import { appHintLine, rotation } from './nudges';
import { addPlace, countryNamer, fold, optionParts, placeName, placeNames, removePlace } from './places';
import { PlacesStore, provisionalMeta, type PlaceSet } from './places-store';
import { cookieString, fillPrefs, finishOf, namesPlaces, parseCookies, sameSearch, savedCookies, sharedRequest, shareUrl, type Prefs } from './prefs';
import { routeRows, type RouteRow, type Warn } from './results';
import { glideLinks } from './scroll';
import { Ticker } from './ticker';

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
const TEXT = JSON.parse(document.querySelector<HTMLElement>('[data-i18n]')!.dataset.i18n!) as Dict['widget']['script'] & {
  nights: Plural;
  loading: string;
};
const MESSAGES = TEXT.messages;
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
  notifyAsk: byId('notify-ask'),
  notifyYes: byId<HTMLButtonElement>('notify-yes'),
  notifyNo: byId<HTMLButtonElement>('notify-no'),
  results: byId('results'),
  resultsTitle: byId('results-title'),
  resultsTrip: byId('results-trip'),
  resultsShared: byId('results-shared'),
  resultsSearched: byId('results-searched'),
  searchAgain: byId<HTMLButtonElement>('search-again'),
  placeholder: byId('route-placeholder'),
  resultsEmpty: byId('results-empty'),
  insights: byId('insights'),
  appHint: byId('app-hint'),
  routeRows: byId('route-rows'),
  more: byId('more-routes'),
  coverage: byId('coverage'),
  upsell: byId('upsell'),
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

const localName = (place: Place) => placeName(place, LOCALE);
const countryName = countryNamer(LOCALE);
const nameOf = (code: string) => {
  const place = byCode.get(code);
  return place ? localName(place) : code;
};
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

const picker = new RangePicker({
  trigger: el.window,
  label: el.windowText,
  dialog: el.calendar,
  months: el.calMonths,
  prev: el.calPrev,
  next: el.calNext,
  maxDays: () => meta.limits.max_window_days,
  format: ({ from, to }) => `${formatDay(from)} – ${formatDay(to)}`,
  locale: LOCALE,
});

function setTexts(root: ParentNode, texts: Record<string, string>) {
  for (const [selector, text] of Object.entries(texts)) part(root, selector).textContent = text;
}

function showText(node: HTMLElement, text: string) {
  node.textContent = text;
  node.hidden = !text;
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
const boxes = new Map<HTMLInputElement, Combobox>();

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

function renderNights() {
  const limit = meta?.limits.max_nights ?? nights.max;
  el.minNights.value = String(nights.min);
  el.maxNights.value = String(nights.max);
  for (const stepper of document.querySelectorAll<HTMLElement>('.stepper')) {
    const value = nights[stepper.dataset.nights as keyof Nights];
    part<HTMLButtonElement>(stepper, '[data-step="-1"]').disabled = value <= 1;
    part<HTMLButtonElement>(stepper, '[data-step="1"]').disabled = value >= limit;
  }
}

function renderQuota() {
  const left = meta.free_searches_left;
  if (left === null) el.quotaNote.textContent = '';
  else if (left > 0) el.quotaNote.textContent = count(MESSAGES.left, left);
  else el.quotaNote.textContent = MESSAGES.quota;
}

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
  renderQuota();
}

function renderNames() {
  if (pickedFrom) setFrom(pickedFrom);
  for (const name of ['ends', 'cities'] as const) if (lists[name].length) renderList(name);
}

function setupForm(cookies: Map<string, string>): Prefs {
  const limits = { maxNights: meta.limits.max_nights, maxWindowDays: meta.limits.max_window_days };
  const prefs = fillPrefs(new URLSearchParams(location.search), cookies, (code) => byCode.has(code), limits);
  setFrom(prefs.from.value);
  setLists(prefs.back.value, prefs.cities.value);
  for (const field of ['from', 'back', 'cities'] as const) remembered(field, prefs[field].source === 'cookie');
  const dates = prefs.dates.value;
  if (dates && dates.from >= localToday()) picker.set(dates);
  if (prefs.nights.value) nights = prefs.nights.value;
  renderNights();
  renderQuota();
  return prefs;
}

function fillForm(r: SearchRequest) {
  for (const field of ['from', 'back', 'cities'] as const) remembered(field, false);
  setFrom(r.start);
  setLists(finishOf(r), r.cities);
  picker.set({ from: r.date_from, to: r.date_to });
  nights = { min: r.min_nights, max: r.max_nights };
  renderNights();
}

// Text typed in Back to but never picked counts when it names a place; with a cap of 1 the field's text is the pick.
function readEnds(): string[] | undefined {
  const typed = el.back.value.trim();
  if (!typed || (!severalEnds() && lists.ends.length)) return lists.ends;
  const code = resolvePlace(typed);
  return code ? addPlace(lists.ends, code, maxEnds()) : undefined;
}

function readForm(): Trip | string {
  const from = pickedFrom ?? resolvePlace(el.from.value);
  if (!from) return MESSAGES.start;
  const ends = readEnds();
  if (!ends) return MESSAGES.end;
  const cities = lists.cities;
  if (!cities.length) return MESSAGES.noCities;
  if (cities.length > maxCities()) return count(MESSAGES.cityLimit, maxCities());
  if ([from, ...ends].some((code) => cities.includes(code))) return MESSAGES.overlap;

  const { from: dateFrom, to: dateTo } = picker.range;
  if (!dateFrom || !dateTo) return MESSAGES.dates;
  if (dateFrom < localToday()) return MESSAGES.past;
  const span = daysBetween(dateFrom, dateTo);
  if (!(span > 0 && span <= meta.limits.max_window_days)) return fill(MESSAGES.window, { max: meta.limits.max_window_days });

  const limit = meta.limits.max_nights;
  if (nights.min < 1 || nights.max > limit || nights.min > nights.max) return fill(MESSAGES.nights, { max: limit });

  return { start: from, ends, cities: [...cities], dateFrom, dateTo, minNights: nights.min, maxNights: nights.max };
}

const withNewRequestId = (request: SearchRequest): SearchRequest => ({ ...request, client_request_id: crypto.randomUUID() });

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = undefined;
}

const writeUrl = (request: SearchRequest) => history.replaceState(history.state, '', shareUrl(location.pathname, request, SHARE_HASH));

// aria-busy keeps the live results region quiet while its placeholders swap, so only the outcome is announced.
function setSearching(on: boolean) {
  el.results.classList.toggle('searching', on);
  el.results.setAttribute('aria-busy', String(on));
}

// The table stays on the page: before any search it shows the empty state, while one runs its placeholders pulse.
function showPlaceholder(searching: boolean) {
  for (const node of [el.resultsTitle, el.resultsTrip, el.resultsShared, el.resultsEmpty, el.insights, el.appHint, el.more, el.coverage]) {
    node.hidden = true;
  }
  el.routeRows.replaceChildren();
  el.placeholder.hidden = false;
  setSearching(searching);
}

function clearOutcome(searching = false) {
  stopPolling();
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
  el.upsell.hidden = !upsell;
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

function tripLine(r: SearchRequest): string {
  const finish = finishOf(r);
  return fill(MESSAGES.trip, {
    start: nameOf(r.start),
    cities: listOf.format(r.cities.map(nameOf)),
    finish: finish.length ? fill(MESSAGES.finishingIn, { name: anyOf.format(finish.map(nameOf)) }) : '',
    from: formatDay(r.date_from),
    to: formatDay(r.date_to),
  });
}

function legRows(row: RouteRow): HTMLElement[] {
  return row.legs.map((leg, i) => {
    const tr = clone('leg-row-template');
    tr.id = `route-${row.rank}-leg-${i}`;
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
    if (leg.link) {
      book.href = leg.link;
      book.setAttribute('aria-label', fill(MESSAGES.book, { from: leg.from, to: leg.to }));
    } else {
      book.remove();
    }
    return tr;
  });
}

function renderRow(row: RouteRow): HTMLElement[] {
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
    ...row.warnings.map((w) => {
      const chip = clone('warn-template');
      chip.textContent = MESSAGES.warn[w];
      return chip;
    }),
  );
  const legs = legRows(row);
  const toggle = part<HTMLButtonElement>(tr, '.details-toggle');
  if (!legs.length) {
    toggle.remove();
    return [tr];
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
  return [tr, ...legs];
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
  const { rows, more } = routeRows(view, { name: nameOf, money: formatMoney, day: formatDay });
  showText(el.resultsTitle, rows.length ? count(MESSAGES.found, rows.length) : MESSAGES.none);
  showText(el.resultsTrip, tripLine(request));
  el.resultsShared.hidden = true;
  el.resultsEmpty.hidden = rows.length > 0;
  showText(el.insights, view.insights ? insightsLine(view.insights) : '');
  showText(el.appHint, appHintLine(view.app_hint, view.routes[0]?.price, formatMoney, TEXT.nudges.appHint) ?? '');
  el.routeRows.replaceChildren(...rows.flatMap(renderRow));
  part(el.more, 'a').textContent = count(MESSAGES.more, more);
  el.more.hidden = more <= 0;
  showText(el.coverage, coverageLine(view.sources));

  el.placeholder.hidden = true;
  setSearching(false);
  el.progress.hidden = true;
  el.upsell.hidden = !(more > 0 || rows.some((r) => r.kind !== 'full'));
  el.submit.disabled = false;
  writeUrl(request);
  pushAds();
}

function searchedLine(view: SearchView): string {
  const date = searchedAt(view);
  return date ? fill(MESSAGES.searchedOn, { date: searchedFormat.format(date) }) : '';
}

// A stored result someone shared: shown as it was found, with its time and a way to run it afresh.
function showShared(view: SearchView, request: SearchRequest) {
  renderResults(view, request);
  el.resultsSearched.textContent = searchedLine(view);
  el.resultsShared.hidden = false;
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

function resume(saved: Saved, resubmitted = false): Promise<void> {
  clearOutcome(true);
  el.submit.disabled = true;
  renderReconnecting();
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
    const current = canLookup(saved.request, localToday());
    if (current) {
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
  if (firstSeen) routesReady({ Notification: globalThis.Notification, doc: document, focus: () => window.focus(), text: TEXT.notify });
  renderResults(view, saved.request);
}

async function submit(request: SearchRequest, resubmitted = false): Promise<void> {
  const retry = () => submit(request, resubmitted);
  clearOutcome(true);
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
      const saved = { id: outcome.id, request };
      save(saved);
      return poll(saved, resubmitted);
    }
    case 'quota':
      meta.free_searches_left = 0;
      renderQuota();
      return showProblem(MESSAGES.quota, undefined, true);
    case 'city_limit':
      return showProblem(count(MESSAGES.cityLimit, maxCities()), undefined, true);
    case 'invalid':
      return showProblem(MESSAGES.invalid);
    case 'app_only':
      return showProblem(MESSAGES.appOnly, undefined, true);
    case 'busy':
      return showProblem(MESSAGES.busy, retry);
    case 'web_unavailable':
      return showProblem(MESSAGES.webUnavailable, retry, true);
    case 'error':
      return showProblem(MESSAGES.network, retry);
  }
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
  () => (lists.cities.length >= maxCities() ? TEXT.nudges.cityCap : undefined),
);
placeBox(el.from, el.fromList, () => lists.cities, (p) => {
  setFrom(p.code);
  remembered('from', false);
});
placeBox(el.back, el.backList, () => taken('ends'), (p) => addTo('ends', p.code));

el.from.addEventListener('input', () => {
  pickedFrom = undefined;
  remembered('from', false);
});
el.from.addEventListener('change', () => {
  const code = pickedFrom ?? resolvePlace(el.from.value);
  if (code) setFrom(code);
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
  const stepper = step?.closest<HTMLElement>('.stepper');
  if (step && stepper) {
    nights = stepNights(nights, stepper.dataset.nights as keyof Nights, Number(step.dataset.step), meta.limits.max_nights);
    renderNights();
    return;
  }
  const chip = target.closest<HTMLButtonElement>('.locked-chip');
  if (!chip) return;
  const pressed = chip.getAttribute('aria-pressed') !== 'true';
  for (const other of el.fields.querySelectorAll('.locked-chip')) other.setAttribute('aria-pressed', 'false');
  chip.setAttribute('aria-pressed', String(pressed));
  showText(el.chipNudge, pressed ? (chip.dataset.nudge ?? '') : '');
});

el.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const trip = readForm();
  if (typeof trip === 'string') {
    el.formError.textContent = trip;
    return;
  }
  el.formError.textContent = '';
  for (const cookie of savedCookies(trip)) document.cookie = cookie;
  el.notifyAsk.hidden = askedToNotify || !canAsk(globalThis.Notification);
  void submit(buildRequest(trip, crypto.randomUUID()));
  el.progress.scrollIntoView({ block: 'start' });
});

el.form.addEventListener('input', () => {
  el.formError.textContent = '';
});

el.retry.addEventListener('click', () => retryAction?.());

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

glideLinks('search');
setupStrip(parseCookies(document.cookie));
picker.set(defaultWindow());
el.fields.addEventListener('focusin', () => void loadPlaces());
loadPlacesWhenIdle();
const firstMeta = getMeta();
firstMeta.catch(() => undefined);
void openForm().then((prefs) => init(prefs, firstMeta));
