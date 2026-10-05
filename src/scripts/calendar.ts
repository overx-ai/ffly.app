import { LOCALE } from '../app';

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

export const addDays = (iso: string, days: number) => isoOf(new Date(parse(iso) + days * DAY_MS));
export const daysBetween = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);

export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Weeks run Monday to Sunday (en-GB), padded with the neighbouring months' days.
export function monthGrid(year: number, month: number): Day[][] {
  const first = new Date(Date.UTC(year, month, 1));
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

const monthTitle = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fullDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' });
const MONDAY = '2024-01-01';
const WEEKDAYS = Array.from({ length: WEEK }, (_, i) => weekday.format(new Date(parse(addDays(MONDAY, i)))));

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
}

// A two-month range popover with a roving tabindex: arrows move a day or a week, Enter picks, Esc cancels.
export class RangePicker {
  range: Required<Range> = { from: '', to: '' };
  private draft: Range = {};
  private view = { year: 0, month: 0 };
  private focusDay = '';

  constructor(private readonly o: PickerOptions) {
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
    if (target < localToday()) return;
    this.focusDay = target;
    const { year, month } = this.view;
    const firstShown = isoOf(new Date(Date.UTC(year, month, 1)));
    const lastShown = isoOf(new Date(Date.UTC(year, month + MONTHS_SHOWN, 0)));
    if (target < firstShown || target > lastShown) {
      this.showMonthOf(target, step < 0 ? MONTHS_SHOWN - 1 : 0);
    } else {
      this.render();
    }
    this.focus();
  }

  private showMonthOf(iso: string, position = 0) {
    const date = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 - position, 1));
    this.view = { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    this.render();
  }

  private shift(months: number) {
    const date = new Date(Date.UTC(this.view.year, this.view.month + months, 1));
    this.view = { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    this.render();
  }

  private focus() {
    this.o.months.querySelector<HTMLButtonElement>(`button[data-iso="${this.focusDay}"]`)?.focus();
  }

  private render() {
    const today = localToday();
    const thisMonth = today.slice(0, 7);
    const { year, month } = this.view;
    this.o.prev.disabled = isoOf(new Date(Date.UTC(year, month, 1))).slice(0, 7) <= thisMonth;
    const tables = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const first = new Date(Date.UTC(year, month + i, 1));
      return this.monthTable(first.getUTCFullYear(), first.getUTCMonth(), today);
    });
    this.o.months.replaceChildren(...tables);
  }

  private monthTable(year: number, month: number, today: string): HTMLElement {
    const table = document.createElement('table');
    table.className = 'cal-month';
    const caption = table.createCaption();
    caption.textContent = monthTitle.format(new Date(Date.UTC(year, month, 1)));
    const head = table.createTHead().insertRow();
    for (const name of WEEKDAYS) {
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
        button.setAttribute('aria-label', fullDay.format(new Date(parse(day.iso))));
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
