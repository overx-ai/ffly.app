import { LANG_HINT } from '../app';
import { hintLang, isSettled, settle, type LangHintEntry } from './lang-hint-state';

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
})();

const openMenu = () => document.querySelector<HTMLDetailsElement>('.lang-menu[open]');

const closeMenuOutside = (target: EventTarget | null) => {
  const menu = openMenu();
  if (menu && target instanceof Node && !menu.contains(target)) menu.open = false;
};

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const pick = target?.closest<HTMLElement>('[data-lang-pick]');
  if (pick?.dataset.langPick) settle(storage, pick.dataset.langPick);
  closeMenuOutside(target);
});

// Tabbing past the open menu would leave its panel over the next focused control.
document.addEventListener('focusin', (event) => closeMenuOutside(event.target));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const menu = openMenu();
  if (!menu) return;
  const hadFocus = menu.contains(document.activeElement);
  menu.open = false;
  if (hadFocus) menu.querySelector('summary')?.focus();
});

function showHint(card: HTMLElement) {
  const hints: LangHintEntry[] = JSON.parse(card.dataset.hints ?? '[]');
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const codes = hints.map((h) => h.code);
  const code = hintLang(languages, card.dataset.lang, codes, isSettled(storage));
  const hint = hints.find((h) => h.code === code);
  const text = card.querySelector<HTMLElement>('[data-hint-text]');
  const open = card.querySelector<HTMLAnchorElement>('[data-hint-open]');
  const close = card.querySelector<HTMLButtonElement>('[data-hint-close]');
  if (!hint || !text || !open || !close) return;
  card.lang = hint.tag;
  card.classList.toggle('other-script', hint.system);
  text.textContent = hint.text;
  open.textContent = hint.open;
  open.href = hint.href;
  open.hreflang = hint.hreflang;
  open.dataset.langPick = hint.code;
  close.setAttribute('aria-label', hint.close);
  close.addEventListener('click', () => {
    settle(storage, LANG_HINT.dismissed);
    const hadFocus = card.contains(document.activeElement);
    card.hidden = true;
    if (hadFocus) document.querySelector<HTMLElement>('.lang-menu summary')?.focus();
  });
  card.hidden = false;
}

const card = document.getElementById('lang-hint');
if (card) showHint(card);
