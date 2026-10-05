import { PREFS, WEB_SEARCH } from '../app';
import type { Dict } from '../i18n';
import { fill, plural, type Plural, type Vars } from '../i18n/text';
import { RangePicker, addDays, daysBetween, localToday, stepNights, type Nights } from './calendar';
import { Combobox, matchPlaces } from './combobox';
import {
  ACTIVE,
  NotFound,
  buildRequest,
  createSearch,
  getMeta,
  getSearch,
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
import { cookieString, fillPrefs, parseCookies, savedCookies } from './prefs';
import { routeRows, type RouteRow, type Warn } from './results';
import { glideLinks } from './scroll';

interface Saved {
  id: string;
  request: SearchRequest;
  finished?: boolean;
}

type Field = 'from' | 'back' | 'cities';
type PlaceField = Exclude<Field, 'cities'>;

const MINUTE_S = 60;

// One bundle serves every language: SearchForm renders that page's strings into data-i18n (the CSP allows no
// inline script), and <html lang> is the locale of every date, number and list.
const TEXT = JSON.parse(document.querySelector<HTMLElement>('[data-i18n]')!.dataset.i18n!) as Dict['widget']['script'];
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
let names = new Map<string, string>();
const picked: Record<PlaceField, string | undefined> = { from: undefined, back: undefined };
let cities: string[] = [];
let nights: Nights = { min: WEB_SEARCH.minNights, max: WEB_SEARCH.maxNights };
let retryAction: (() => void) | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let askedToNotify = false;
let adsPushed = false;

const nameOf = (code: string) => names.get(code) ?? code;
const maxCities = () => Math.min(meta.tier_limits.max_cities, meta.limits.max_cities);
const formatMoney = (amount: number) => money.format(amount);

const listOf = new Intl.ListFormat(LOCALE, { type: 'conjunction' });
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const countFormat = new Intl.NumberFormat(LOCALE);
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

function finishOf(request: SearchRequest): string | undefined {
  const end = request.ends[0];
  return end && end !== request.start ? end : undefined;
}

function showText(node: HTMLElement, text: string) {
  node.textContent = text;
  node.hidden = !text;
}

function resolvePlace(raw: string): string | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  if (names.has(text.toUpperCase())) return text.toUpperCase();
  const lower = text.toLowerCase();
  return meta.places.find((p) => p.name.toLowerCase() === lower)?.code;
}

function remembered(field: Field, on: boolean) {
  for (const tag of document.querySelectorAll<HTMLElement>(`[data-remembered="${field}"]`)) tag.hidden = !on;
}

function storage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

const save = (saved: Saved) => storage()?.setItem(WEB_SEARCH.storageKey, JSON.stringify(saved));

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
  storage()?.removeItem(WEB_SEARCH.storageKey);
  return undefined;
}

function placeOption(place: Place): HTMLElement {
  const row = clone('place-option-template');
  part(row, '.place-name').textContent = place.name;
  const airports = place.airports && place.airports.length > 1 ? place.airports.join(' · ') : '';
  showText(part(row, '.place-airports'), airports);
  part(row, '.place-code').textContent = place.code;
  return row;
}

function placeNotice(text: string): HTMLElement {
  const row = clone('place-notice-template');
  part(row, '.notice-text').textContent = text;
  return row;
}

function placeBox(input: HTMLInputElement, list: HTMLElement, onPick: (place: Place) => void, notice?: () => string | undefined) {
  return new Combobox({
    input,
    list,
    options: (query) =>
      matchPlaces(meta.places, query, {
        exclude: new Set([...cities, ...(input === el.city ? [picked.from, picked.back] : [])].filter(isText)),
        limit: WEB_SEARCH.placeMatches,
      }),
    renderOption: placeOption,
    renderNotice: placeNotice,
    notice,
    onPick,
  });
}

function setPlace(field: PlaceField, code: string | undefined) {
  picked[field] = code;
  el[field].value = code ? nameOf(code) : '';
}

function renderCities() {
  const max = maxCities();
  el.cities.replaceChildren(
    ...cities.map((code) => {
      const chip = clone('chip-template');
      part(chip, '.chip-name').textContent = nameOf(code);
      const remove = part<HTMLButtonElement>(chip, '.chip-remove');
      remove.setAttribute('aria-label', fill(MESSAGES.removeCity, { name: nameOf(code) }));
      remove.addEventListener('click', () => {
        cities = cities.filter((c) => c !== code);
        remembered('cities', false);
        renderCities();
        el.city.focus();
      });
      return chip;
    }),
  );
  el.cityCount.textContent = fill(MESSAGES.cityCount, { n: cities.length, max });
}

function addCity(code: string) {
  if (!cities.includes(code) && cities.length < maxCities()) cities.push(code);
  el.city.value = '';
  remembered('cities', false);
  renderCities();
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

function setupForm(cookies: Map<string, string>) {
  names = new Map(meta.places.map((p) => [p.code, p.name]));
  money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: meta.currency });
  const prefs = fillPrefs(new URLSearchParams(location.search), cookies, (code) => names.has(code));
  setPlace('from', prefs.from.value);
  setPlace('back', prefs.back.value);
  cities = prefs.cities.value.slice(0, maxCities());
  for (const field of ['from', 'back', 'cities'] as const) remembered(field, prefs[field].source === 'cookie');
  renderCities();
  renderNights();
  renderQuota();
}

function fillForm(r: SearchRequest) {
  setPlace('from', r.start);
  setPlace('back', finishOf(r));
  cities = r.cities.slice(0, maxCities());
  renderCities();
  picker.set({ from: r.date_from, to: r.date_to });
  nights = { min: r.min_nights, max: r.max_nights };
  renderNights();
}

function readForm(): Trip | string {
  const from = picked.from ?? resolvePlace(el.from.value);
  if (!from) return MESSAGES.start;
  const end = el.back.value.trim() ? (picked.back ?? resolvePlace(el.back.value)) : from;
  if (!end) return MESSAGES.end;
  if (!cities.length) return MESSAGES.noCities;
  if (cities.length > maxCities()) return count(MESSAGES.cityLimit, maxCities());
  if (cities.includes(from) || cities.includes(end)) return MESSAGES.overlap;

  const { from: dateFrom, to: dateTo } = picker.range;
  if (!dateFrom || !dateTo) return MESSAGES.dates;
  if (dateFrom < localToday()) return MESSAGES.past;
  const span = daysBetween(dateFrom, dateTo);
  if (!(span > 0 && span <= meta.limits.max_window_days)) return fill(MESSAGES.window, { max: meta.limits.max_window_days });

  const limit = meta.limits.max_nights;
  if (nights.min < 1 || nights.max > limit || nights.min > nights.max) return fill(MESSAGES.nights, { max: limit });

  return { start: from, end, cities: [...cities], dateFrom, dateTo, minNights: nights.min, maxNights: nights.max };
}

const withNewRequestId = (request: SearchRequest): SearchRequest => ({ ...request, client_request_id: crypto.randomUUID() });

function stopPolling() {
  clearTimeout(pollTimer);
  pollTimer = undefined;
}

function clearOutcome() {
  stopPolling();
  el.problem.hidden = true;
  el.results.hidden = true;
  el.upsell.hidden = true;
  el.progress.hidden = true;
}

function showProblem(message: string, retry?: () => void, upsell = false) {
  stopPolling();
  el.progress.hidden = true;
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
    finish: finish ? fill(MESSAGES.finishingIn, { name: nameOf(finish) }) : '',
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
  el.resultsTitle.textContent = rows.length ? count(MESSAGES.found, rows.length) : MESSAGES.none;
  el.resultsTrip.textContent = tripLine(request);
  el.resultsEmpty.hidden = rows.length > 0;
  showText(el.insights, view.insights ? insightsLine(view.insights) : '');
  showText(el.appHint, appHintLine(view.app_hint, view.routes[0]?.price, formatMoney, TEXT.nudges.appHint) ?? '');
  el.routeRows.replaceChildren(...rows.flatMap(renderRow));
  part(el.more, 'a').textContent = count(MESSAGES.more, more);
  el.more.hidden = more <= 0;
  showText(el.coverage, coverageLine(view.sources));

  el.progress.hidden = true;
  el.results.hidden = false;
  el.upsell.hidden = !(more > 0 || rows.some((r) => r.kind !== 'full'));
  el.submit.disabled = false;
  pushAds();
}

function resume(saved: Saved, resubmitted = false): Promise<void> {
  clearOutcome();
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
    // Resubmit unasked only a search lost mid-run (an API restart): never spend a free search
    // re-running one already shown, nor one whose dates have passed.
    const current = saved.request.date_from >= localToday();
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
  clearOutcome();
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

function showRotation(cookies: Map<string, string>) {
  const { index, next } = rotation(cookies.get(PREFS.nudge.cookie), TEXT.nudges.rotation.length);
  el.nudge.textContent = TEXT.nudges.rotation[index];
  [...el.nudgeDots.children].forEach((dot, i) => dot.classList.toggle('on', i === index));
  document.cookie = cookieString(PREFS.nudge, String(next));
}

const cityBox = placeBox(el.city, el.cityList, (p) => addCity(p.code), () =>
  cities.length >= maxCities() ? TEXT.nudges.cityCap : undefined,
);
for (const [field, list] of [['from', el.fromList], ['back', el.backList]] as const) {
  const input = el[field];
  placeBox(input, list, (p) => {
    setPlace(field, p.code);
    remembered(field, false);
  });
  input.addEventListener('input', () => {
    picked[field] = undefined;
    remembered(field, false);
  });
  input.addEventListener('change', () => {
    const code = picked[field] ?? resolvePlace(input.value);
    if (code) setPlace(field, code);
  });
}

el.city.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  event.preventDefault();
  if (!el.city.value.trim()) return;
  const code = resolvePlace(el.city.value);
  if (code) {
    addCity(code);
    cityBox.close();
  } else {
    el.formError.textContent = MESSAGES.pickCity;
  }
});

el.fields.addEventListener('click', (event) => {
  const target = event.target as Element;
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

function closeNotifyAsk() {
  askedToNotify = true;
  el.notifyAsk.hidden = true;
}

el.notifyYes.addEventListener('click', () => {
  closeNotifyAsk();
  void ask(globalThis.Notification);
});

el.notifyNo.addEventListener('click', closeNotifyAsk);

async function init(): Promise<void> {
  clearOutcome();
  try {
    meta = await getMeta();
  } catch {
    return showProblem(MESSAGES.metaDown, () => void init());
  }
  setupForm(parseCookies(document.cookie));
  el.loading.hidden = true;
  el.fields.disabled = false;

  const saved = load();
  if (saved) {
    fillForm(saved.request);
    void resume(saved);
  }
}

glideLinks('search');
showRotation(parseCookies(document.cookie));
picker.set(defaultWindow());
renderNights();
void init();
