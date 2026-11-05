import { PHONE_QUERY } from '../app';

export const isPhone = () => matchMedia(PHONE_QUERY).matches;

export const onPhoneChange = (run: () => void) => matchMedia(PHONE_QUERY).addEventListener('change', run);

// The back/forward cache keeps a page whole, an open sheet and the fixed body with it.
export function onSheetExit(run: () => void) {
  onPhoneChange(run);
  window.addEventListener('pagehide', run);
}

// A box that is no tab stop takes focus only with a tabindex; without one focus() does nothing.
export function focusBox(box: HTMLElement) {
  box.tabIndex = -1;
  box.focus({ preventScroll: true });
}

let locks = 0;
let lockedAt = 0;

// overflow: hidden does not stop iOS scrolling the page under a fixed sheet; a fixed body does.
export function lockScroll() {
  locks += 1;
  if (locks > 1) return;
  lockedAt = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${lockedAt}px`, left: '0', right: '0' });
}

export function unlockScroll() {
  if (locks === 0) return;
  locks -= 1;
  if (locks > 0) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
  window.scrollTo(0, lockedAt);
}

// The visual viewport is the part above the keyboard; the layout viewport does not shrink for it on iOS.
export function fitToViewport(root: HTMLElement): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => undefined;
  const fit = () => {
    root.style.setProperty('--sheet-height', `${viewport.height}px`);
    root.style.setProperty('--sheet-top', `${viewport.offsetTop}px`);
  };
  fit();
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  return () => {
    viewport.removeEventListener('resize', fit);
    viewport.removeEventListener('scroll', fit);
    root.style.removeProperty('--sheet-height');
    root.style.removeProperty('--sheet-top');
  };
}
