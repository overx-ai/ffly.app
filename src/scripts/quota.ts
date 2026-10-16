import { plural, type Plural } from '../i18n/text';
import { searchWindow, type Meta } from './ffly-api';

export interface QuotaText {
  left: Plural;
  quota: string;
  quotaWindow: Plural;
}

// Spec 016: when more searches come, in the caller's own window from /meta (1.13.0); without one, only that they ran out.
export function quotaSpent(meta: Pick<Meta, 'tier_limits'>, text: QuotaText, locale: string): string {
  const limit = searchWindow(meta.tier_limits);
  return limit ? plural(locale, text.quotaWindow, limit.hours) : text.quota;
}

// The note under Find routes: nothing for Pro or a caller /meta does not count, else what is left, else when more come.
export function quotaNote(meta: Pick<Meta, 'tier_limits' | 'free_searches_left'>, pro: boolean, text: QuotaText, locale: string): string {
  const left = meta.free_searches_left;
  if (pro || left === null) return '';
  return left > 0 ? plural(locale, text.left, left) : quotaSpent(meta, text, locale);
}
