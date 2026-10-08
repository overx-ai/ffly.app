import { describe, expect, it } from 'vitest';
import { LANG_HINT } from '../src/app';
import { LANGS } from '../src/i18n/locales';
import { hintLang, isSettled, settle, siteLang } from '../src/scripts/lang-hint-state';

const CODES = LANGS.map((l) => l.code);

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const throwing = {
  getItem(): string | null {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

describe('siteLang', () => {
  it('maps a browser tag to the site language by its base', () => {
    expect(siteLang('ru-RU', CODES)).toBe('ru');
    expect(siteLang('en-US', CODES)).toBe('en');
    expect(siteLang('pt-BR', CODES)).toBe('pt');
    expect(siteLang('DE', CODES)).toBe('de');
    expect(siteLang('cs', CODES)).toBeUndefined();
  });

  it('reads every Norwegian tag as nb', () => {
    for (const tag of ['nb-NO', 'nb', 'no', 'nn-NO']) expect(siteLang(tag, CODES)).toBe('nb');
  });
});

describe('hintLang', () => {
  const offer = (languages: string[], page: Parameters<typeof hintLang>[1]) => hintLang(languages, page, CODES, false);

  it('offers the first browser language the site has when it is not the page language', () => {
    expect(offer(['ru-RU', 'en'], 'en')).toBe('ru');
    expect(offer(['ru'], 'de')).toBe('ru');
    expect(offer(['nb-NO'], 'en')).toBe('nb');
    expect(offer(['no'], 'en')).toBe('nb');
    expect(offer(['pt-BR'], 'en')).toBe('pt');
    expect(offer(['cs', 'fi'], 'en')).toBe('fi');
  });

  it('offers nothing when the first language the site has is the page language', () => {
    expect(offer(['en-GB'], 'en')).toBeUndefined();
    expect(offer(['cs', 'en'], 'en')).toBeUndefined();
    expect(offer(['de'], 'de')).toBeUndefined();
    expect(offer(['en', 'ru'], 'en')).toBeUndefined();
  });

  it('offers nothing for a browser with no language the site has', () => {
    expect(offer(['cs', 'ja'], 'en')).toBeUndefined();
    expect(offer([], 'en')).toBeUndefined();
  });

  it('offers nothing once the visitor dismissed the hint or picked a language', () => {
    expect(hintLang(['ru-RU'], 'en', CODES, true)).toBeUndefined();
  });
});

describe('the stored choice', () => {
  it('is unsettled until the hint is dismissed or a language picked', () => {
    const storage = new MemoryStorage();
    expect(isSettled(storage)).toBe(false);
    settle(storage, 'dismissed');
    expect(isSettled(storage)).toBe(true);
    expect(storage.getItem(LANG_HINT.storageKey)).toBe('dismissed');
  });

  it('counts a picked language as settled', () => {
    const storage = new MemoryStorage();
    settle(storage, 'ru');
    expect(isSettled(storage)).toBe(true);
    expect(hintLang(['ru-RU'], 'en', CODES, isSettled(storage))).toBeUndefined();
  });

  it('still decides, and never throws, when storage throws or is missing', () => {
    expect(() => settle(throwing, 'dismissed')).not.toThrow();
    expect(isSettled(throwing)).toBe(false);
    expect(hintLang(['ru-RU'], 'en', CODES, isSettled(throwing))).toBe('ru');
    expect(isSettled(undefined)).toBe(false);
    expect(() => settle(undefined, 'ru')).not.toThrow();
  });
});
