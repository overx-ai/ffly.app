import { LANG_HINT } from '../app';
import type { Lang } from '../i18n/locales';

type HintStorage = Pick<Storage, 'getItem' | 'setItem'>;

const ALIASES: Partial<Record<string, Lang>> = { no: 'nb', nn: 'nb' };

// `codes` come from the page's hint card, so the client bundle never carries the LANGS table.
export function siteLang(tag: string, codes: readonly Lang[]): Lang | undefined {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  const code = ALIASES[base] ?? base;
  return codes.find((c) => c === code);
}

export function hintLang(
  languages: readonly string[],
  pageLang: string | undefined,
  codes: readonly Lang[],
  settled: boolean,
): Lang | undefined {
  if (settled) return undefined;
  const wanted = languages.map((tag) => siteLang(tag, codes)).find((code) => code !== undefined);
  return wanted === pageLang ? undefined : wanted;
}

export function isSettled(storage: HintStorage | undefined): boolean {
  try {
    return storage?.getItem(LANG_HINT.storageKey) != null;
  } catch {
    return false;
  }
}

export function settle(storage: HintStorage | undefined, value: string) {
  try {
    storage?.setItem(LANG_HINT.storageKey, value);
  } catch {
    // Without storage the hint still works; it just comes back on the next page.
  }
}

export interface LangHintEntry {
  code: Lang;
  tag: string;
  hreflang: string;
  href: string;
  system: boolean;
  text: string;
  open: string;
  close: string;
}
