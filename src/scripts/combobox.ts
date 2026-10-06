import type { Place } from './ffly-api';
import { fold, placeName } from './places';

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

const groupMembers = (places: Place[]) =>
  new Set(places.flatMap((p) => (p.airports && p.airports.length > 1 ? p.airports.filter((a) => a !== p.code) : [])));

// Below this length "contains" would match nearly every place.
const CONTAINS_FROM = 3;
const WORD_BREAK = /[\s\-'’().,/]+/u;
const RANK = { code: 0, prefix: 1, wordStart: 2, contains: 3 } as const;

function rankOf(place: Place, q: string, lang: string): number | undefined {
  const codes = [place.code, ...(place.airports ?? [])].map(fold);
  if (codes.includes(q)) return RANK.code;
  const names = [placeName(place, lang), place.name].map(fold);
  if (names.some((n) => n.startsWith(q)) || codes.some((c) => c.startsWith(q))) return RANK.prefix;
  if (names.some((n) => n.split(WORD_BREAK).some((word) => word.startsWith(q)))) return RANK.wordStart;
  if (q.length >= CONTAINS_FROM && names.some((n) => n.includes(q))) return RANK.contains;
  return undefined;
}

// Exact code (a city's airport codes included) > name prefix > word start > contains, top places first within each.
export function matchPlaces(places: Place[], query: string, opts: { exclude: Set<string>; limit: number; lang: string }): Place[] {
  const q = fold(query.trim());
  const members = groupMembers(places);
  const shown = places.filter((p) => !opts.exclude.has(p.code) && !members.has(p.code));
  if (!q) return shown.filter((p) => p.top).slice(0, opts.limit);
  return shown
    .flatMap((place) => {
      const rank = rankOf(place, q, opts.lang);
      return rank === undefined ? [] : [{ place, rank }];
    })
    .sort((a, b) => a.rank - b.rank || Number(b.place.top) - Number(a.place.top))
    .slice(0, opts.limit)
    .map((m) => m.place);
}

export interface ComboOptions {
  input: HTMLInputElement;
  list: HTMLElement;
  options: (query: string) => Place[];
  renderOption: (place: Place) => HTMLElement;
  renderNotice: (text: string) => HTMLElement;
  notice?: () => string | undefined;
  onPick: (place: Place) => void;
}

// ARIA 1.2 combobox: focus stays in the input, the active row is announced through aria-activedescendant.
export class Combobox {
  private state = CLOSED;
  private items: Place[] = [];
  private noticeText: string | undefined;

  constructor(private readonly o: ComboOptions) {
    o.input.addEventListener('input', () => this.open());
    o.input.addEventListener('focus', () => this.open());
    o.input.addEventListener('blur', () => this.close());
    o.input.addEventListener('keydown', (event) => this.key(event));
    o.list.addEventListener('pointerdown', (event) => event.preventDefault());
    o.list.addEventListener('click', (event) => {
      const row = (event.target as Element).closest<HTMLElement>('[data-index]');
      if (row) this.pick(Number(row.dataset.index));
    });
  }

  close() {
    this.state = CLOSED;
    this.render();
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

  private key(event: KeyboardEvent) {
    if (!this.state.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) this.refresh();
    const step = comboKey(this.state, event.key, this.items.length);
    if (!step) return;
    event.preventDefault();
    this.state = step.state;
    if (step.pick === undefined) this.render();
    else this.pick(step.pick);
  }

  private pick(index: number) {
    const place = this.items[index];
    this.close();
    if (place) this.o.onPick(place);
  }

  private render() {
    const { input, list } = this.o;
    const { open, active } = this.state;
    const rows = this.noticeText
      ? [this.o.renderNotice(this.noticeText)]
      : this.items.map((place, i) => {
          const row = this.o.renderOption(place);
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
