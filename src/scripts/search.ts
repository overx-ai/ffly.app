import { WEB_SEARCH } from '../app';
import {
  ACTIVE,
  NotFound,
  createSearch,
  getMeta,
  getSearch,
  type Insights,
  type Meta,
  type Route,
  type SearchRequest,
  type SearchView,
  type SubmitOutcome,
} from './ffly-api';

interface Saved {
  id: string;
  request: SearchRequest;
  finished?: boolean;
}

const OPTION_CODE = /\(([A-Z0-9]{3})\)$/;
const MINUTE_S = 60;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const MESSAGES = {
  topPick: (priority: string) => `Top pick: ${priority}`,
  start: 'Choose where you start from the list.',
  end: 'Choose where you finish from the list, or leave it empty.',
  noCities: 'Add at least one city to visit.',
  overlap: 'A city to visit cannot also be where you start or finish.',
  dates: 'Choose the dates of your travel window.',
  past: 'Your travel window cannot start in the past.',
  window: (max: number) => `Your travel window can be 1 to ${max} days long.`,
  nights: (max: number) => `Nights in each city go from 1 to ${max}, and the least cannot be more than the most.`,
  cityLimit: (max: number) => `The free web search takes up to ${max} cities.`,
  cityCount: (n: number, max: number) => `${n} of ${max}`,
  addCity: 'Add a city',
  cityFull: 'That is the most for a web search',
  pickCity: 'Pick each city from the list.',
  quota: "You've used today's free web searches. The app has more.",
  left: (n: number) => `${n} free web ${plural(n, 'search', 'searches')} left today.`,
  invalid: 'Some trip details were not accepted. Check them and try again.',
  busy: 'ffly is busy right now. Try again in a minute.',
  network: 'Could not reach ffly. Check your connection and try again.',
  failed: 'This search did not finish. Try again in a moment.',
  expired: 'This search has expired. Run it again.',
  metaDown: 'Could not load the list of cities. Check your connection and try again.',
  fetching: 'Checking fares',
  planning: 'Working out the best order',
  starting: 'Starting',
  checks: (done: number, total: number) => `${done} of ${total} fare checks`,
  etaSoon: 'under a minute left',
  eta: (min: number) => `about ${min} min left`,
  found: (n: number) => `${n} ${plural(n, 'route', 'routes')} found`,
  none: 'No route fits this trip',
  nightCount: (n: number) => `${n} ${plural(n, 'night', 'nights')}`,
  cities: (n: number) => `${n} ${plural(n, 'city', 'cities')}`,
  more: (n: number) => `${n} more ${plural(n, 'route', 'routes')} in the app`,
  removeCity: (name: string) => `Remove ${name}`,
  rank: (n: number) => `Route ${n}`,
  coverage: "Some fares couldn't be checked right now.",
  trip: (start: string, cities: string, finish: string, from: string, to: string) =>
    `${start} to ${cities}${finish}. ${from} to ${to}.`,
  finishingIn: (name: string) => `, finishing in ${name}`,
  compared: (fares: string, days: number) => `Compared ${fares} fares across ${days} days.`,
  gains: (list: string) => `Against booking the cheapest next flight each time: ${list}.`,
  savedLess: (amount: string) => `${amount} less`,
  earlyStarts: (n: number) => `${n} fewer early ${plural(n, 'start', 'starts')}`,
  sleepGained: (h: number) => `${h} h more sleep`,
  lateLandings: (n: number) => `${n} fewer midnight ${plural(n, 'landing', 'landings')}`,
  daylightGained: (h: number) => `${h} h more daylight`,
} as const;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const part = <T extends HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T;

const el = {
  form: byId<HTMLFormElement>('search-form'),
  fields: byId<HTMLFieldSetElement>('search-fields'),
  loading: byId('search-loading'),
  places: byId<HTMLDataListElement>('places'),
  start: byId<HTMLInputElement>('start'),
  end: byId<HTMLInputElement>('end'),
  city: byId<HTMLInputElement>('city'),
  cities: byId<HTMLUListElement>('cities'),
  cityCount: byId('city-count'),
  dateFrom: byId<HTMLInputElement>('date-from'),
  dateTo: byId<HTMLInputElement>('date-to'),
  minNights: byId<HTMLInputElement>('min-nights'),
  maxNights: byId<HTMLInputElement>('max-nights'),
  priorities: byId('priorities'),
  direct: byId<HTMLInputElement>('direct'),
  formError: byId('form-error'),
  submit: byId<HTMLButtonElement>('submit'),
  quotaNote: byId('quota-note'),
  problem: byId('problem'),
  problemText: byId('problem-text'),
  retry: byId<HTMLButtonElement>('retry'),
  progress: byId('progress'),
  progressStatus: byId('progress-status'),
  progressBar: byId('progress-bar'),
  progressFill: byId('progress-fill'),
  progressDetail: byId('progress-detail'),
  results: byId('results'),
  resultsTitle: byId('results-title'),
  resultsTrip: byId('results-trip'),
  resultsEmpty: byId('results-empty'),
  insights: byId('insights'),
  best: byId('best'),
  others: byId<HTMLOListElement>('others'),
  more: byId('more-routes'),
  coverage: byId('coverage'),
  upsell: byId('upsell'),
};

const clone = (id: string) => byId<HTMLTemplateElement>(id).content.firstElementChild!.cloneNode(true) as HTMLElement;

let meta: Meta;
let money: Intl.NumberFormat;
let names = new Map<string, string>();
let cities: string[] = [];
let retryAction: (() => void) | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

const nameOf = (code: string) => names.get(code) ?? code;
const optionLabel = (code: string) => `${nameOf(code)} (${code})`;
const maxCities = () => Math.min(meta.tier_limits.max_cities, meta.limits.max_cities);

const listOf = new Intl.ListFormat(WEB_SEARCH.locale, { type: 'conjunction' });
const dayFormat = new Intl.DateTimeFormat(WEB_SEARCH.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const countFormat = new Intl.NumberFormat(WEB_SEARCH.locale);
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

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
  const code = text.match(OPTION_CODE)?.[1] ?? text.toUpperCase();
  if (names.has(code)) return code;
  const lower = text.toLowerCase();
  return meta.places.find((p) => p.name.toLowerCase() === lower)?.code;
}

function storage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

const save = (saved: Saved) => storage()?.setItem(WEB_SEARCH.storageKey, JSON.stringify(saved));

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
    isText(r.priority) &&
    isText(r.client_request_id)
  );
}

function load(): Saved | undefined {
  const raw = storage()?.getItem(WEB_SEARCH.storageKey);
  if (!raw) return undefined;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    saved = undefined;
  }
  if (isSaved(saved)) return saved;
  storage()?.removeItem(WEB_SEARCH.storageKey);
  return undefined;
}

function renderCities() {
  const max = maxCities();
  el.cities.replaceChildren(
    ...cities.map((code) => {
      const chip = clone('chip-template');
      part(chip, '.chip-name').textContent = nameOf(code);
      const remove = part<HTMLButtonElement>(chip, '.chip-remove');
      remove.setAttribute('aria-label', MESSAGES.removeCity(nameOf(code)));
      remove.addEventListener('click', () => {
        cities = cities.filter((c) => c !== code);
        renderCities();
        el.city.focus();
      });
      return chip;
    }),
  );
  el.cityCount.textContent = MESSAGES.cityCount(cities.length, max);
  const full = cities.length >= max;
  el.city.disabled = full;
  el.city.placeholder = full ? MESSAGES.cityFull : MESSAGES.addCity;
}

function addCity(): boolean {
  const code = resolvePlace(el.city.value);
  if (!code) return false;
  if (!cities.includes(code) && cities.length < maxCities()) cities.push(code);
  el.city.value = '';
  renderCities();
  return true;
}

function setupForm() {
  names = new Map(meta.places.map((p) => [p.code, p.name]));
  money = new Intl.NumberFormat(WEB_SEARCH.locale, { style: 'currency', currency: meta.currency });
  const ordered = [...meta.places].sort((a, b) => Number(b.top) - Number(a.top));
  el.places.replaceChildren(
    ...ordered.map((p) => {
      const option = document.createElement('option');
      option.value = optionLabel(p.code);
      return option;
    }),
  );

  el.priorities.replaceChildren(
    ...Object.entries(meta.priorities).map(([key, p]) => {
      const choice = clone('priority-template');
      const radio = part<HTMLInputElement>(choice, 'input');
      radio.value = key;
      radio.checked = key === meta.default_priority;
      part(choice, '.choice-label').textContent = p.label;
      part(choice, '.choice-hint').textContent = p.hint;
      return choice;
    }),
  );

  el.dateFrom.min = isoDay(0);
  el.dateTo.min = isoDay(1);
  el.dateFrom.value = isoDay(WEB_SEARCH.startInDays);
  el.dateTo.value = isoDay(WEB_SEARCH.startInDays + WEB_SEARCH.windowDays);
  for (const input of [el.minNights, el.maxNights]) input.max = String(meta.limits.max_nights);
  el.minNights.value = String(WEB_SEARCH.minNights);
  el.maxNights.value = String(WEB_SEARCH.maxNights);

  renderCities();
  renderQuota();
}

function renderQuota() {
  const left = meta.free_searches_left;
  if (left === null) el.quotaNote.textContent = '';
  else if (left > 0) el.quotaNote.textContent = MESSAGES.left(left);
  else el.quotaNote.textContent = MESSAGES.quota;
}

function fillForm(r: SearchRequest) {
  const finish = finishOf(r);
  el.start.value = optionLabel(r.start);
  el.end.value = finish ? optionLabel(finish) : '';
  cities = r.cities.slice(0, maxCities());
  renderCities();
  el.dateFrom.value = r.date_from;
  el.dateTo.value = r.date_to;
  el.minNights.value = String(r.min_nights);
  el.maxNights.value = String(r.max_nights);
  for (const radio of el.priorities.querySelectorAll<HTMLInputElement>('input')) radio.checked = radio.value === r.priority;
  el.direct.checked = r.max_stops_per_leg === 0;
}

function readForm(): SearchRequest | string {
  const start = resolvePlace(el.start.value);
  if (!start) return MESSAGES.start;
  const end = el.end.value.trim() ? resolvePlace(el.end.value) : start;
  if (!end) return MESSAGES.end;
  if (!cities.length) return MESSAGES.noCities;
  if (cities.length > maxCities()) return MESSAGES.cityLimit(maxCities());
  if (cities.includes(start) || cities.includes(end)) return MESSAGES.overlap;

  const from = el.dateFrom.value;
  const to = el.dateTo.value;
  if (!from || !to) return MESSAGES.dates;
  if (from < isoDay(0)) return MESSAGES.past;
  const span = daysBetween(from, to);
  if (!(span > 0 && span <= meta.limits.max_window_days)) return MESSAGES.window(meta.limits.max_window_days);

  const min = el.minNights.valueAsNumber;
  const max = el.maxNights.valueAsNumber;
  const maxNights = meta.limits.max_nights;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > maxNights || min > max) {
    return MESSAGES.nights(maxNights);
  }

  const priority = el.priorities.querySelector<HTMLInputElement>('input:checked')?.value ?? meta.default_priority;
  return {
    start,
    ends: [end],
    cities: [...cities],
    date_from: from,
    date_to: to,
    min_nights: min,
    max_nights: max,
    priority,
    ...(el.direct.checked ? { max_stops_per_leg: 0 } : {}),
    client_request_id: crypto.randomUUID(),
  };
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
  const parts = [view.total ? MESSAGES.checks(view.done, view.total) : MESSAGES.starting];
  if (view.eta_s !== null) parts.push(view.eta_s < MINUTE_S ? MESSAGES.etaSoon : MESSAGES.eta(Math.round(view.eta_s / MINUTE_S)));
  el.progressDetail.textContent = parts.join(' · ');
  el.progress.hidden = false;
}

function insightsLine(i: Insights): string {
  const lines: string[] = [];
  if (i.fares_compared && i.days_searched) {
    lines.push(MESSAGES.compared(countFormat.format(i.fares_compared), i.days_searched));
  }
  const gains = [
    i.saved_eur != null && MESSAGES.savedLess(money.format(i.saved_eur)),
    i.early_starts_avoided != null && MESSAGES.earlyStarts(i.early_starts_avoided),
    i.sleep_saved_h != null && MESSAGES.sleepGained(i.sleep_saved_h),
    i.hotel_nights_saved != null && MESSAGES.lateLandings(i.hotel_nights_saved),
    i.daylight_gained_h != null && MESSAGES.daylightGained(i.daylight_gained_h),
  ].filter((g): g is string => Boolean(g));
  if (gains.length) lines.push(MESSAGES.gains(listOf.format(gains)));
  return lines.join(' ');
}

function coverageLine(sources: SearchView['sources']): string {
  return (sources ?? []).some((s) => s.status !== 'ok') ? MESSAGES.coverage : '';
}

function fillRouteCard(card: HTMLElement, route: Route): HTMLElement {
  part(card, '.price').textContent = money.format(route.price);
  part(card, '.locked').hidden = !route.locked;
  return card;
}

function bestCard(route: Route, priority: string | undefined): HTMLElement {
  const card = clone('best-template');
  const label = priority ? meta.priorities[priority]?.label : undefined;
  if (label) part(card, '.lbl').textContent = MESSAGES.topPick(label);
  const places = route.places ?? [];
  part(card, '.chain').replaceChildren(
    ...places.map((code, i) => {
      const stop = clone('stop-template');
      part(stop, '.city').textContent = nameOf(code);
      const nights = route.nights?.[i - 1];
      if (i > 0 && i < places.length - 1 && nights != null) part(stop, '.nights').textContent = MESSAGES.nightCount(nights);
      return stop;
    }),
  );
  return fillRouteCard(card, route);
}

function routeCard(route: Route, rank: number): HTMLElement {
  const card = clone('route-template');
  part(card, '.rank').textContent = MESSAGES.rank(rank);
  part(card, '.cities').textContent = MESSAGES.cities(route.n_cities);
  return fillRouteCard(card, route);
}

function tripLine(r: SearchRequest): string {
  const finish = finishOf(r);
  return MESSAGES.trip(
    nameOf(r.start),
    listOf.format(r.cities.map(nameOf)),
    finish ? MESSAGES.finishingIn(nameOf(finish)) : '',
    formatDay(r.date_from),
    formatDay(r.date_to),
  );
}

function renderResults(view: SearchView, request: SearchRequest) {
  const [first, ...rest] = view.routes;
  el.resultsTitle.textContent = first ? MESSAGES.found(view.routes.length) : MESSAGES.none;
  el.resultsTrip.textContent = tripLine(request);
  el.resultsEmpty.hidden = Boolean(first);

  showText(el.insights, view.insights ? insightsLine(view.insights) : '');

  el.best.replaceChildren();
  if (first) el.best.append(first.places ? bestCard(first, request.priority) : routeCard(first, 1));
  el.others.replaceChildren(...rest.map((route, i) => routeCard(route, i + 2)));

  const more = view.more_routes ?? 0;
  part(el.more, 'a').textContent = MESSAGES.more(more);
  el.more.hidden = more <= 0;

  showText(el.coverage, coverageLine(view.sources));

  el.progress.hidden = true;
  el.results.hidden = false;
  el.upsell.hidden = !(more > 0 || view.routes.some((r) => r.locked));
  el.submit.disabled = false;
}

function resume(saved: Saved, resubmitted = false): Promise<void> {
  clearOutcome();
  el.submit.disabled = true;
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
      pollTimer = setTimeout(() => poll(saved, resubmitted, failures + 1), WEB_SEARCH.pollRetryBaseMs * 2 ** failures);
      return;
    }
    // Resubmit unasked only a search lost mid-run (an API restart): never spend a free search
    // re-running one already shown, nor one whose dates have passed.
    const current = saved.request.date_from >= isoDay(0);
    if (!resubmitted && !saved.finished && current) return submit(saved.request, true);
    return showProblem(MESSAGES.expired, current ? searchAgain : undefined);
  }
  if (ACTIVE.includes(view.status)) {
    renderProgress(view);
    pollTimer = setTimeout(() => poll(saved, resubmitted), WEB_SEARCH.pollMs);
    return;
  }
  save({ ...saved, finished: true });
  if (view.status === 'failed') return showProblem(MESSAGES.failed, searchAgain);
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
      return showProblem(MESSAGES.cityLimit(maxCities()), undefined, true);
    case 'invalid':
      return showProblem(MESSAGES.invalid);
    case 'busy':
      return showProblem(MESSAGES.busy, retry);
    case 'error':
      return showProblem(MESSAGES.network, retry);
  }
}

el.city.addEventListener('input', () => {
  if (OPTION_CODE.test(el.city.value)) addCity();
});

el.city.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (el.city.value.trim() && !addCity()) el.formError.textContent = MESSAGES.pickCity;
});

for (const input of [el.start, el.end]) {
  input.addEventListener('change', () => {
    const code = resolvePlace(input.value);
    if (code) input.value = optionLabel(code);
  });
}

el.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const request = readForm();
  if (typeof request === 'string') {
    el.formError.textContent = request;
    return;
  }
  el.formError.textContent = '';
  void submit(request);
  el.progress.scrollIntoView({ block: 'start' });
});

el.form.addEventListener('input', () => {
  el.formError.textContent = '';
});

el.retry.addEventListener('click', () => retryAction?.());

async function init(): Promise<void> {
  clearOutcome();
  try {
    meta = await getMeta();
  } catch {
    return showProblem(MESSAGES.metaDown, () => void init());
  }
  setupForm();
  el.loading.hidden = true;
  el.fields.disabled = false;

  const saved = load();
  if (saved) {
    fillForm(saved.request);
    void resume(saved);
  }
}

void init();
