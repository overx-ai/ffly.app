import type { Place } from './ffly-api';
import { fold, placeNames } from './places';
import { fitToViewport, focusBox, isPhone, lockScroll, onSheetExit, unlockScroll } from './sheet';

export interface ComboState {
  open: boolean;
  active: number;
}

export interface ComboStep {
  state: ComboState;
  pick?: number;
}

const CLOSED: ComboState = { open: false, active: -1 };

export function comboKey(state: ComboState, key: string, count: number): ComboStep | undefined {
  const last = count - 1;
  switch (key) {
    case 'ArrowDown':
      return count ? { state: { open: true, active: state.open ? Math.min(state.active + 1, last) : 0 } } : undefined;
    case 'ArrowUp':
      return count ? { state: { open: true, active: state.open ? Math.max(state.active - 1, 0) : last } } : undefined;
    case 'Home':
    case 'End':
      return state.open && count ? { state: { open: true, active: key === 'Home' ? 0 : last } } : undefined;
    case 'Enter':
      return state.open && state.active >= 0 ? { state: CLOSED, pick: state.active } : undefined;
    case 'Escape':
      return state.open ? { state: CLOSED } : undefined;
    default:
      return undefined;
  }
}

const groupMembers = (places: readonly Place[]) =>
  new Set(places.flatMap((p) => (p.airports && p.airports.length > 1 ? p.airports.filter((a) => a !== p.code) : [])));

// Below this length "contains" would match nearly every place.
const CONTAINS_FROM = 3;
const WORD_BREAK = /[\s\-'’().,/]+/u;
const RANK = { code: 0, prefix: 1, wordStart: 2, contains: 3 } as const;

interface Folded {
  place: Place;
  member: boolean;
  codes: string[];
  names: string[];
  words: string[];
}

// Folding every name on each keystroke costs too much on a phone with thousands of places: once per list and language.
const foldedLists = new WeakMap<readonly Place[], Map<string, Folded[]>>();

function foldedOf(places: readonly Place[], lang: string): Folded[] {
  let byLang = foldedLists.get(places);
  if (!byLang) foldedLists.set(places, (byLang = new Map()));
  let folded = byLang.get(lang);
  if (!folded) {
    const members = groupMembers(places);
    folded = places.map((place) => {
      const names = [...new Set(placeNames(place, lang).map(fold))];
      return {
        place,
        member: members.has(place.code),
        codes: [place.code, ...(place.airports ?? [])].map(fold),
        names,
        words: names.flatMap((n) => n.split(WORD_BREAK)),
      };
    });
    byLang.set(lang, folded);
  }
  return folded;
}

function rankOf({ codes, names, words }: Folded, q: string): number | undefined {
  if (codes.includes(q)) return RANK.code;
  if (names.some((n) => n.startsWith(q)) || codes.some((c) => c.startsWith(q))) return RANK.prefix;
  if (words.some((word) => word.startsWith(q))) return RANK.wordStart;
  if (q.length >= CONTAINS_FROM && names.some((n) => n.includes(q))) return RANK.contains;
  return undefined;
}

// Typed text the user never picked from the list: an exact code or name, else the one place it matches.
// Several matches stay unresolved, so "Lon" is never silently London.
export function resolvePlace(places: readonly Place[], raw: string, lang: string): string | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  const code = text.toUpperCase();
  if (places.some((p) => p.code === code)) return code;
  const typed = fold(text);
  const exact = foldedOf(places, lang).find((f) => f.names.includes(typed));
  if (exact) return exact.place.code;
  const matches = matchPlaces(places, text, { exclude: new Set(), limit: 2, lang });
  return matches.length === 1 ? matches[0].code : undefined;
}

// Exact code (a city's airport codes included) > name prefix > word start > contains, top places first within each.
export function matchPlaces(places: readonly Place[], query: string, opts: { exclude: Set<string>; limit: number; lang: string }): Place[] {
  const q = fold(query.trim());
  const shown = foldedOf(places, opts.lang).filter((f) => !f.member && !opts.exclude.has(f.place.code));
  if (!q) return shown.filter((f) => f.place.top).slice(0, opts.limit).map((f) => f.place);
  return shown
    .flatMap((folded) => {
      const rank = rankOf(folded, q);
      return rank === undefined ? [] : [{ place: folded.place, rank }];
    })
    .sort((a, b) => a.rank - b.rank || Number(b.place.top) - Number(a.place.top))
    .slice(0, opts.limit)
    .map((m) => m.place);
}

export interface ComboOptions<T> {
  input: HTMLInputElement;
  list: HTMLElement;
  options: (query: string) => T[];
  renderOption: (item: T) => HTMLElement;
  renderNotice: (text: string) => HTMLElement;
  notice?: () => string | undefined;
  onPick: (item: T) => void;
  // A chip list stays in its phone sheet after a pick, to add another.
  keepOpen?: () => boolean;
}

// ARIA 1.2 combobox: focus stays in the input, the active row is announced through aria-activedescendant.
export class Combobox<T = Place> {
  private state = CLOSED;
  private items: T[] = [];
  private noticeText: string | undefined;
  private readonly sheet: HTMLElement;
  private sheetOpen = false;
  private unfit = () => {};

  constructor(private readonly o: ComboOptions<T>) {
    // A chip list's sheet holds its chips too.
    this.sheet = o.input.closest<HTMLElement>('.place-box') ?? o.input.closest<HTMLElement>('.combo')!;
    o.input.addEventListener('input', () => this.open());
    o.input.addEventListener('focus', () => {
      this.showSheet();
      this.open();
    });
    o.input.addEventListener('blur', () => {
      if (!this.sheetOpen) this.closeList();
    });
    o.input.addEventListener('keydown', (event) => this.key(event));
    // In the sheet a blur closes nothing, and a prevented touch would keep the list from scrolling on some browsers.
    o.list.addEventListener('pointerdown', (event) => {
      if (!this.sheetOpen) event.preventDefault();
    });
    for (const button of this.sheet.querySelectorAll('.combo-back, .combo-done')) button.addEventListener('click', () => this.hideSheet());
    onSheetExit(() => this.hideSheet());
    // Tabbing or a keyboard's Next out of the sheet would leave it over the field that took focus.
    this.sheet.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && !this.sheet.contains(next)) this.hideSheet(false);
    });
    o.list.addEventListener('click', (event) => {
      const row = (event.target as Element).closest<HTMLElement>('[data-index]');
      if (row) this.pick(Number(row.dataset.index));
    });
  }

  // In the sheet the list is the whole screen, so closing it only redraws it.
  close() {
    if (this.sheetOpen) this.open();
    else this.closeList();
  }

  get inSheet() {
    return this.sheetOpen;
  }

  private closeList() {
    this.state = CLOSED;
    this.render();
  }

  private showSheet() {
    if (this.sheetOpen || !isPhone()) return;
    this.sheetOpen = true;
    this.sheet.classList.add('sheet-open');
    lockScroll();
    this.unfit = fitToViewport(this.sheet);
  }

  private hideSheet(refocus = true) {
    if (!this.sheetOpen) return;
    this.sheetOpen = false;
    this.sheet.classList.remove('sheet-open');
    this.unfit();
    unlockScroll();
    this.o.input.blur();
    this.closeList();
    // The input itself would bring the sheet straight back.
    if (refocus) focusBox(this.sheet);
  }

  // The options changed under an open list (the places arrived): redraw it, else nothing.
  update() {
    if (this.state.open) this.open();
  }

  private refresh() {
    this.noticeText = this.o.notice?.();
    this.items = this.noticeText ? [] : this.o.options(this.o.input.value);
  }

  private open() {
    this.refresh();
    this.state = { open: true, active: -1 };
    this.render();
  }

  private sheetKey(event: KeyboardEvent) {
    event.preventDefault();
    if (event.key === 'Enter' && this.items.length) this.pick(Math.max(this.state.active, 0));
    else this.hideSheet();
  }

  private key(event: KeyboardEvent) {
    if (this.sheetOpen && (event.key === 'Escape' || event.key === 'Enter')) return this.sheetKey(event);
    if (!this.state.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) this.refresh();
    const step = comboKey(this.state, event.key, this.items.length);
    if (!step) return;
    event.preventDefault();
    this.state = step.state;
    if (step.pick === undefined) this.render();
    else this.pick(step.pick);
  }

  private pick(index: number) {
    const item = this.items[index];
    this.closeList();
    if (item) this.o.onPick(item);
    if (!this.sheetOpen) return;
    if (this.o.keepOpen?.()) {
      this.o.input.focus();
      this.open();
    } else {
      this.hideSheet();
    }
  }

  private render() {
    const { input, list } = this.o;
    const { open, active } = this.state;
    const rows = this.noticeText
      ? [this.o.renderNotice(this.noticeText)]
      : this.items.map((item, i) => {
          const row = this.o.renderOption(item);
          row.id = `${list.id}-${i}`;
          row.dataset.index = String(i);
          row.setAttribute('aria-selected', String(i === active));
          return row;
        });
    list.replaceChildren(...rows);
    const shown = open && rows.length > 0;
    list.hidden = !shown;
    input.setAttribute('aria-expanded', String(shown));
    if (shown && active >= 0) {
      input.setAttribute('aria-activedescendant', rows[active].id);
      rows[active].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
}
