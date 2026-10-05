import { describe, expect, it } from 'vitest';
import { SCROLL_MS } from '../src/app';
import { easeOut, scrollAt, scrollDuration } from '../src/scripts/scroll';

describe('scroll easing', () => {
  it('eases out from 0 to 1, fast first', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
    expect(easeOut(0.25)).toBeLessThan(easeOut(0.5));
  });

  it('runs about 1200 ms, and is instant under reduced motion', () => {
    expect(SCROLL_MS).toBe(1200);
    expect(scrollDuration(false)).toBe(SCROLL_MS);
    expect(scrollDuration(true)).toBe(0);
  });

  it('positions along the way and lands exactly', () => {
    expect(scrollAt(100, 900, 0, 1000)).toBe(100);
    expect(scrollAt(100, 900, 500, 1000)).toBe(100 + 800 * easeOut(0.5));
    expect(scrollAt(100, 900, 1500, 1000)).toBe(900);
    expect(scrollAt(100, 900, 0, 0)).toBe(900);
  });
});
