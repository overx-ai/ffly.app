import { PHONE_QUERY } from '../app';

export const isPhone = () => matchMedia(PHONE_QUERY).matches;

export const onPhoneChange = (run: () => void) => matchMedia(PHONE_QUERY).addEventListener('change', run);

let locks = 0;
let lockedAt = 0;

// overflow: hidden does not stop iOS scrolling the page under a fixed sheet; a fixed body does.
export function lockScroll() {
  if (locks++) return;
  lockedAt = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${lockedAt}px`, left: '0', right: '0' });
}

export function unlockScroll() {
  if (!locks || --locks) return;
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
