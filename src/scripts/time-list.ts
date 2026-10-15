// A time list for flight hours (spec 015): a button opens a listbox of times, arrows move, Enter picks, Esc cancels.
// Custom, as every control of the search form: no time input.

export interface TimeListOptions {
  button: HTMLButtonElement;
  list: HTMLUListElement;
  choices: () => string[];
  value: () => string;
  label: (clock: string) => string;
  onPick: (clock: string) => void;
}

const KEY_STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 4, PageUp: -4 };

export class TimeList {
  private active = 0;
  private shown: string[] = [];

  constructor(private readonly o: TimeListOptions) {
    o.button.addEventListener('click', () => (o.list.hidden ? this.open() : this.close()));
    o.list.addEventListener('click', (event) => {
      const option = (event.target as Element).closest<HTMLElement>('[data-clock]');
      if (option) this.pick(option.dataset.clock!);
    });
    o.list.addEventListener('keydown', (event) => this.key(event));
    // Tabbing away closes it; a click elsewhere may move no focus at all (Safari), so pointerdown covers that.
    o.list.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && !o.list.contains(next) && next !== o.button) this.close(false);
    });
    document.addEventListener('pointerdown', (event) => {
      const target = event.target as Node;
      if (!o.list.hidden && !o.list.contains(target) && !o.button.contains(target)) this.close(false);
    });
  }

  render() {
    this.o.button.textContent = this.o.label(this.o.value());
  }

  private open() {
    this.shown = this.o.choices();
    const current = this.shown.indexOf(this.o.value());
    this.active = current >= 0 ? current : 0;
    this.o.list.replaceChildren(
      ...this.shown.map((clock, i) => {
        const option = document.createElement('li');
        option.id = `${this.o.list.id}-${i}`;
        option.className = 'time-option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(i === current));
        option.dataset.clock = clock;
        option.textContent = this.o.label(clock);
        return option;
      }),
    );
    this.o.list.hidden = false;
    this.o.button.setAttribute('aria-expanded', 'true');
    this.o.list.focus();
    this.move(0);
  }

  private close(returnFocus = true) {
    this.o.list.hidden = true;
    this.o.button.setAttribute('aria-expanded', 'false');
    if (returnFocus) this.o.button.focus();
  }

  private pick(clock: string) {
    this.o.onPick(clock);
    this.render();
    this.close();
  }

  private move(delta: number) {
    this.active = Math.min(this.shown.length - 1, Math.max(0, this.active + delta));
    const option = this.o.list.children[this.active] as HTMLElement | undefined;
    if (!option) return;
    for (const other of this.o.list.querySelectorAll('.active')) other.classList.remove('active');
    option.classList.add('active');
    this.o.list.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  private key(event: KeyboardEvent) {
    if (event.key in KEY_STEP) this.move(KEY_STEP[event.key]);
    else if (event.key === 'Home') this.move(-this.active);
    else if (event.key === 'End') this.move(this.shown.length);
    else if (event.key === 'Enter' || event.key === ' ') this.pick(this.shown[this.active]);
    else if (event.key === 'Escape') this.close();
    else return;
    event.preventDefault();
  }
}
