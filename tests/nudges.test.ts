import { describe, expect, it } from 'vitest';
import { DICTIONARIES, LANGS, editionOf } from '../src/i18n';
import en from '../src/i18n/en';
import { proCaller } from '../src/scripts/ffly-api';
import { appHintLine, rotation, webNudges } from '../src/scripts/nudges';

const NUDGES = en.widget.script.nudges;

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

  it('covers six tips without a city count, in 1.0 and in v2', () => {
    for (const v2 of [false, true]) {
      const tips = webNudges(editionOf(en, v2).widget.script.nudges, 'en-GB').rotation;
      expect(tips).toHaveLength(6);
      expect(tips.join(' ')).not.toMatch(/up to \d|unlimited/i);
    }
  });
});

describe('webNudges', () => {
  it("counts the app's free searches in each language's own plural", () => {
    expect(webNudges(NUDGES, 'en-GB').rotation[2]).toBe('3 full searches free in the app.');
    for (const { code, tag } of LANGS) {
      const tip = webNudges(DICTIONARIES[code].widget.script.nudges, tag).rotation[2];
      expect(tip, code).toMatch(/(^|\D)3(\D|$)/);
      expect(tip, code).not.toContain('{n}');
    }
  });
});

describe('proCaller', () => {
  it('is Pro only with v2 on and a Pro /meta, so 1.0 never hides a Free nudge', () => {
    expect(proCaller({ tier: 'pro' }, true)).toBe(true);
    expect(proCaller({ tier: 'pro' }, false)).toBe(false);
    expect(proCaller({ tier: 'free' }, true)).toBe(false);
    expect(proCaller(undefined, true)).toBe(false);
  });
});

describe('appHintLine', () => {
  it('states the app price and the difference only when the app is cheaper', () => {
    expect(appHintLine({ price: 100 }, 130, euro, NUDGES.appHint)).toBe('Same trip in the app: from €100.00, €30.00 less.');
    expect(appHintLine({ price: 130 }, 130, euro, NUDGES.appHint)).toBeUndefined();
    expect(appHintLine(null, 130, euro, NUDGES.appHint)).toBeUndefined();
    expect(appHintLine({ price: 100 }, undefined, euro, NUDGES.appHint)).toBeUndefined();
  });
});
