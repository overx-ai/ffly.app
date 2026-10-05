import { fill } from '../i18n/text';

// The app strip's first tip per page view: show the stored index, store the next.
export function rotation(stored: string | undefined, count: number) {
  const n = Number(stored);
  const index = Number.isInteger(n) && n >= 0 ? n % count : 0;
  return { index, next: (index + 1) % count };
}

export function appHintLine(
  hint: { price: number } | null | undefined,
  best: number | undefined,
  money: (n: number) => string,
  template: string,
): string | undefined {
  if (!hint || best === undefined || !(hint.price < best)) return undefined;
  return fill(template, { from: money(hint.price), less: money(best - hint.price) });
}
