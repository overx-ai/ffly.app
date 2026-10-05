import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ticker } from '../src/scripts/ticker';

const MS = 5000;

describe('Ticker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (reducedMotion = false, start = 0) => {
    const onChange = vi.fn();
    const ticker = new Ticker({ count: 3, intervalMs: MS, reducedMotion, start, onChange });
    return { ticker, onChange };
  };

  it('advances every interval from its start and wraps around', () => {
    const { ticker, onChange } = make(false, 1);
    vi.advanceTimersByTime(MS - 1);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(2, false);
    vi.advanceTimersByTime(MS);
    expect(onChange).toHaveBeenLastCalledWith(0, false);
    expect(ticker.index).toBe(0);
  });

  it('pauses while any reason holds and restarts a full interval on resume', () => {
    const { ticker, onChange } = make();
    ticker.pause('hover');
    ticker.pause('hidden');
    vi.advanceTimersByTime(3 * MS);
    expect(onChange).not.toHaveBeenCalled();
    ticker.resume('hover');
    vi.advanceTimersByTime(3 * MS);
    expect(onChange).not.toHaveBeenCalled();
    ticker.resume('hidden');
    vi.advanceTimersByTime(MS - 1);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith(1, false);
  });

  it('runs no timer under reduced motion', () => {
    const { ticker, onChange } = make(true);
    ticker.resume('offscreen');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10 * MS);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops for good when a tip is picked by hand', () => {
    const { ticker, onChange } = make();
    ticker.show(2);
    expect(onChange).toHaveBeenLastCalledWith(2, true);
    ticker.pause('hover');
    ticker.resume('hover');
    vi.advanceTimersByTime(10 * MS);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
