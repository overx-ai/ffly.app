export interface Day {
  iso: string;
  day: number;
  inMonth: boolean;
}

export interface Range {
  from?: string;
  to?: string;
}

export interface Nights {
  min: number;
  max: number;
}

const DAY_MS = 86_400_000;
const WEEK = 7;
const MONTHS_SHOWN = 2;

const isoOf = (date: Date) => date.toISOString().slice(0, 10);
const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const firstOf = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

function monthAt(year: number, month: number) {
  const first = firstOf(year, month);
  return { year: first.getUTCFullYear(), month: first.getUTCMonth() };
}

export const addDays = (iso: string, days: number) => isoOf(new Date(parse(iso) + days * DAY_MS));
export const daysBetween = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);

export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Weeks run Monday to Sunday, as in every language the site speaks, padded with the neighbouring months' days.
export function monthGrid(year: number, month: number): Day[][] {
  const first = firstOf(year, month);
  const lead = (first.getUTCDay() + WEEK - 1) % WEEK;
  const start = addDays(isoOf(first), -lead);
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((lead + length) / WEEK) }, (_, w) =>
    Array.from({ length: WEEK }, (_, d) => {
      const iso = addDays(start, w * WEEK + d);
      return { iso, day: Number(iso.slice(8)), inMonth: Number(iso.slice(5, 7)) === month + 1 };
    }),
  );
}

export function pickDay(range: Range, day: string, maxDays: number): Range {
  if (!range.from || range.to || day <= range.from || daysBetween(range.from, day) > maxDays) return { from: day };
  return { from: range.from, to: day };
}

export function dayState(day: string, range: Range, today: string, maxDays: number) {
  const { from, to } = range;
  const choosingEnd = Boolean(from && !to);
  return {
    disabled: day < today || (choosingEnd && day > from! && daysBetween(from!, day) > maxDays),
    start: day === from,
    end: day === to,
    inRange: from !== undefined && (to ? day >= from && day <= to : day === from),
  };
}

export function stepNights(nights: Nights, which: keyof Nights, delta: number, limit: number): Nights {
  const value = Math.min(limit, Math.max(1, nights[which] + delta));
  return which === 'min' ? { min: value, max: Math.max(nights.max, value) } : { min: Math.min(nights.min, value), max: value };
}

const MONDAY = '2024-01-01';

export function calendarText(locale: string) {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return {
    monthTitle: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    fullDay: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
    weekdays: Array.from({ length: WEEK }, (_, i) => weekday.format(new Date(parse(addDays(MONDAY, i))))),
  };
}

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -WEEK, ArrowDown: WEEK };

export interface PickerOptions {
  trigger: HTMLButtonElement;
  label: HTMLElement;
  dialog: HTMLElement;
  months: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  maxDays: () => number;
  format: (range: Required<Range>) => string;
  locale: string;
}

// A two-month range popover with a roving tabindex: arrows move a day or a week, Enter picks, Esc cancels.
export class RangePicker {
  range: Required<Range> = { from: '', to: '' };
  private draft: Range = {};
  private view = { year: 0, month: 0 };
  private focusDay = '';
  private readonly text: ReturnType<typeof calendarText>;

  constructor(private readonly o: PickerOptions) {
    this.text = calendarText(o.locale);
    o.trigger.addEventListener('click', () => (o.dialog.hidden ? this.open() : this.close()));
    o.prev.addEventListener('click', () => this.shift(-1));
    o.next.addEventListener('click', () => this.shift(1));
    o.months.addEventListener('click', (event) => {
      const iso = (event.target as Element).closest<HTMLButtonElement>('button[data-iso]')?.dataset.iso;
      if (iso) this.pick(iso);
    });
    o.months.addEventListener('keydown', (event) => this.key(event));
    o.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
    o.dialog.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && !o.dialog.contains(next) && !o.trigger.contains(next)) this.close(false);
    });
    document.addEventListener('pointerdown', (event) => {
      const target = event.target as Node;
      if (!o.dialog.hidden && !o.dialog.contains(target) && !o.trigger.contains(target)) this.close(false);
    });
  }

  set(range: Required<Range>) {
    this.range = range;
    this.o.label.textContent = this.o.format(range);
  }

  private open() {
    this.draft = { ...this.range };
    this.focusDay = this.range.from > localToday() ? this.range.from : localToday();
    this.showMonthOf(this.focusDay);
    this.o.dialog.hidden = false;
    this.o.trigger.setAttribute('aria-expanded', 'true');
    this.focus();
  }

  private close(returnFocus = true) {
    this.o.dialog.hidden = true;
    this.o.trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) this.o.trigger.focus();
  }

  private pick(iso: string) {
    this.draft = pickDay(this.draft, iso, this.o.maxDays());
    this.focusDay = iso;
    if (this.draft.from && this.draft.to) {
      this.set({ from: this.draft.from, to: this.draft.to });
      this.close();
      return;
    }
    this.render();
    this.focus();
  }

  private key(event: KeyboardEvent) {
    const step = KEY_STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = addDays(this.focusDay, step);
    // A disabled day cannot take focus, and the re-render would drop it to the page.
    if (dayState(target, this.draft, localToday(), this.o.maxDays()).disabled) return;
    this.focusDay = target;
    const { first, last } = this.shown();
    if (target < first || target > last) {
      this.showMonthOf(target, step < 0 ? MONTHS_SHOWN - 1 : 0);
    } else {
      this.render();
    }
    this.focus();
  }

  private shown() {
    const { year, month } = this.view;
    return { first: isoOf(firstOf(year, month)), last: isoOf(new Date(Date.UTC(year, month + MONTHS_SHOWN, 0))) };
  }

  private showMonthOf(iso: string, position = 0) {
    this.showMonth(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 - position);
  }

  private shift(months: number) {
    this.showMonth(this.view.year, this.view.month + months);
  }

  private showMonth(year: number, month: number) {
    this.view = monthAt(year, month);
    // Keep one day in view tabbable after paging months.
    const { first, last } = this.shown();
    if (this.focusDay < first || this.focusDay > last) this.focusDay = first > localToday() ? first : localToday();
    this.render();
  }

  private focus() {
    this.o.months.querySelector<HTMLButtonElement>(`button[data-iso="${this.focusDay}"]`)?.focus();
  }

  private render() {
    const today = localToday();
    const thisMonth = today.slice(0, 7);
    const { year, month } = this.view;
    this.o.prev.disabled = this.shown().first.slice(0, 7) <= thisMonth;
    const tables = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const shown = monthAt(year, month + i);
      return this.monthTable(shown.year, shown.month, today);
    });
    this.o.months.replaceChildren(...tables);
  }

  private monthTable(year: number, month: number, today: string): HTMLElement {
    const table = document.createElement('table');
    table.className = 'cal-month';
    const caption = table.createCaption();
    caption.textContent = this.text.monthTitle.format(firstOf(year, month));
    const head = table.createTHead().insertRow();
    for (const name of this.text.weekdays) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = name;
      head.append(th);
    }
    const body = table.createTBody();
    for (const week of monthGrid(year, month)) {
      const row = body.insertRow();
      for (const day of week) {
        const cell = row.insertCell();
        if (!day.inMonth) continue;
        const state = dayState(day.iso, this.draft, today, this.o.maxDays());
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.iso = day.iso;
        button.textContent = String(day.day);
        button.setAttribute('aria-label', this.text.fullDay.format(new Date(parse(day.iso))));
        button.setAttribute('aria-pressed', String(state.inRange));
        button.disabled = state.disabled;
        button.tabIndex = day.iso === this.focusDay ? 0 : -1;
        button.classList.toggle('start', state.start);
        button.classList.toggle('end', state.end);
        button.classList.toggle('in-range', state.inRange);
        button.classList.toggle('today', day.iso === today);
        cell.append(button);
      }
    }
    return table;
  }
}
