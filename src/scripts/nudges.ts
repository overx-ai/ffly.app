import type { Dict } from '../i18n';
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

// Spec 015: the flight hours tip leaves the rotation once the web search has flight hours (CONTRACT_1_12).
export const tipsOf = (rotation: readonly string[], hoursTip: string, hoursOnWeb: boolean) =>
  rotation.filter((tip) => !(hoursOnWeb && tip === hoursTip));

// The strip's strings as both the page and the bundle read them.
export const webNudges = (widget: Pick<Dict['widget'], 'script' | 'appOnly'>, hoursOnWeb: boolean) => ({
  ...widget.script.nudges,
  rotation: tipsOf(widget.script.nudges.rotation, widget.appOnly.hours.nudge, hoursOnWeb),
});
