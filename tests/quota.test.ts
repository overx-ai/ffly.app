import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en';
import { quotaNote } from '../src/scripts/quota';

const TEXT = en.widget.script.messages;
const LOCALE = 'en-GB';
const counted = (left: number | null) => ({
  tier_limits: { max_cities: 4, searches_per_day: 20, searches_per_window: 10, window_hours: 12 },
  free_searches_left: left,
});
const uncounted = (left: number | null) => ({ tier_limits: { max_cities: 4, searches_per_day: 5 }, free_searches_left: left });

describe('quotaNote', () => {
  it('counts the searches left, with or without a window', () => {
    expect(quotaNote(counted(1), false, TEXT, LOCALE)).toBe('1 free web search left.');
    expect(quotaNote(uncounted(3), false, TEXT, LOCALE)).toBe('3 free web searches left.');
  });

  it('says when more come only when /meta has a window, and never names a count without one', () => {
    expect(quotaNote(counted(0), false, TEXT, LOCALE)).toBe("You've used your free web searches for now. More in up to 12 hours.");
    expect(quotaNote(uncounted(0), false, TEXT, LOCALE)).toBe("You've used your free web searches for now. Try again later.");
  });

  it('says nothing to Pro or to a caller /meta does not count', () => {
    expect(quotaNote(counted(0), true, TEXT, LOCALE)).toBe('');
    expect(quotaNote(uncounted(null), false, TEXT, LOCALE)).toBe('');
  });
});
