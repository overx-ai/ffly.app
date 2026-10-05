import { describe, expect, it } from 'vitest';
import { addDays, dayState, monthGrid, pickDay, stepNights } from '../src/scripts/calendar';

describe('monthGrid', () => {
  it('starts weeks on Monday and pads with the neighbouring months', () => {
    const weeks = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(weeks[0].map((d) => d.iso)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
    expect(weeks[0].map((d) => d.inMonth)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks.at(-1)!.at(-1)!.iso).toBe('2026-11-01');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('pickDay', () => {
  const max = 30;
  it('starts with the first pick and ends with a later second pick', () => {
    const started = pickDay({}, '2026-11-01', max);
    expect(started).toEqual({ from: '2026-11-01' });
    expect(pickDay(started, '2026-11-08', max)).toEqual({ from: '2026-11-01', to: '2026-11-08' });
  });

  it('restarts on a day before the start, the start itself, past the window, or after a full range', () => {
    expect(pickDay({ from: '2026-11-05' }, '2026-11-01', max)).toEqual({ from: '2026-11-01' });
    expect(pickDay({ from: '2026-11-05' }, '2026-11-05', max)).toEqual({ from: '2026-11-05' });
    expect(pickDay({ from: '2026-11-01' }, '2026-12-15', max)).toEqual({ from: '2026-12-15' });
    expect(pickDay({ from: '2026-11-01', to: '2026-11-08' }, '2026-11-20', max)).toEqual({ from: '2026-11-20' });
  });
});

describe('dayState', () => {
  const today = '2026-10-05';
  it('disables past days', () => {
    expect(dayState('2026-10-04', {}, today, 30).disabled).toBe(true);
    expect(dayState('2026-10-05', {}, today, 30).disabled).toBe(false);
  });

  it('disables days past the window while choosing the end', () => {
    expect(dayState('2026-11-09', { from: '2026-10-10' }, today, 30).disabled).toBe(false);
    expect(dayState('2026-11-10', { from: '2026-10-10' }, today, 30).disabled).toBe(true);
    expect(dayState('2026-11-10', { from: '2026-10-10' }, today, 31).disabled).toBe(false);
    expect(dayState('2026-11-11', { from: '2026-10-10' }, today, 31).disabled).toBe(true);
  });

  it('marks the start, the end and the days between', () => {
    const range = { from: '2026-11-01', to: '2026-11-04' };
    expect(dayState('2026-11-01', range, today, 30)).toMatchObject({ start: true, end: false, inRange: true });
    expect(dayState('2026-11-02', range, today, 30)).toMatchObject({ start: false, end: false, inRange: true });
    expect(dayState('2026-11-04', range, today, 30)).toMatchObject({ end: true, inRange: true });
    expect(dayState('2026-11-05', range, today, 30)).toMatchObject({ inRange: false });
  });
});

describe('stepNights', () => {
  it('clamps to 1 and the limit', () => {
    expect(stepNights({ min: 1, max: 3 }, 'min', -1, 14)).toEqual({ min: 1, max: 3 });
    expect(stepNights({ min: 2, max: 14 }, 'max', 1, 14)).toEqual({ min: 2, max: 14 });
  });

  it('drags the other bound so at least never exceeds at most', () => {
    expect(stepNights({ min: 3, max: 3 }, 'min', 1, 14)).toEqual({ min: 4, max: 4 });
    expect(stepNights({ min: 3, max: 3 }, 'max', -1, 14)).toEqual({ min: 2, max: 2 });
  });
});
