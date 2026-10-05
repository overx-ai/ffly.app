import { SCROLL_MS } from '../app';

export const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const scrollDuration = (reducedMotion: boolean) => (reducedMotion ? 0 : SCROLL_MS);

export function scrollAt(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to;
  return from + (to - from) * easeOut(elapsed / duration);
}

function glideTo(target: HTMLElement) {
  const from = window.scrollY;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const to = target.getBoundingClientRect().top + from - margin;
  const duration = scrollDuration(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const done = () => target.focus({ preventScroll: true });
  if (!duration) {
    window.scrollTo(0, to);
    return done();
  }
  const start = performance.now();
  const frame = (now: number) => {
    window.scrollTo(0, scrollAt(from, to, now - start, duration));
    if (now - start < duration) requestAnimationFrame(frame);
    else done();
  };
  requestAnimationFrame(frame);
}

// Same-page links to a fragment glide there; links from other pages navigate as usual.
export function glideLinks(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(`a[href$="#${id}"]`);
    if (!link || link.pathname !== location.pathname || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    history.pushState(null, '', `#${id}`);
    glideTo(target);
  });
}
