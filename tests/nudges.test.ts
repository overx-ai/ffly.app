import { describe, expect, it } from 'vitest';
import { NUDGES } from '../src/app';
import { appHintLine, rotation } from '../src/scripts/nudges';

const euro = (n: number) => `€${n.toFixed(2)}`;

describe('rotation', () => {
  const n = NUDGES.rotation.length;

  it('shows the stored index and stores the next one', () => {
    expect(rotation('2', n)).toEqual({ index: 2, next: 3 });
    expect(rotation(String(n - 1), n)).toEqual({ index: n - 1, next: 0 });
  });

  it('starts over on a missing or garbled cookie', () => {
    expect(rotation(undefined, n)).toEqual({ index: 0, next: 1 });
    expect(rotation('x', n)).toEqual({ index: 0, next: 1 });
    expect(rotation('-3', n)).toEqual({ index: 0, next: 1 });
    expect(rotation(String(n + 1), n)).toEqual({ index: 1, next: 2 });
  });

  it('covers the six app features without a city count', () => {
    expect(n).toBe(6);
    expect(NUDGES.rotation.join(' ')).not.toMatch(/up to \d|unlimited/i);
  });
});

describe('appHintLine', () => {
  it('states the app price and the difference only when the app is cheaper', () => {
    expect(appHintLine({ price: 100 }, 130, euro)).toBe('Same trip in the app: from €100.00, €30.00 less.');
    expect(appHintLine({ price: 130 }, 130, euro)).toBeUndefined();
    expect(appHintLine(null, 130, euro)).toBeUndefined();
    expect(appHintLine({ price: 100 }, undefined, euro)).toBeUndefined();
  });
});
