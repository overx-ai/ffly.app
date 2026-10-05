import { NUDGES } from '../app';

// One rotation line per page view: show the stored index, store the next.
export function rotation(stored: string | undefined, count: number) {
  const n = Number(stored);
  const index = Number.isInteger(n) && n >= 0 ? n % count : 0;
  return { index, next: (index + 1) % count };
}

export function appHintLine(
  hint: { price: number } | null | undefined,
  best: number | undefined,
  money: (n: number) => string,
): string | undefined {
  if (!hint || best === undefined || !(hint.price < best)) return undefined;
  return NUDGES.appHint(money(hint.price), money(best - hint.price));
}
