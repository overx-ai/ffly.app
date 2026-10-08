// English lives at the root; every other language under its prefix (/de, /de/search...).
// `tag` drives <html lang>, every Intl format and the "Searched" date; `hreflang` the alternates.
export const LANGS = [
  { code: 'en', prefix: '', hreflang: 'en', tag: 'en-GB', og: 'en_GB', name: 'English' },
  { code: 'de', prefix: 'de', hreflang: 'de', tag: 'de', og: 'de_DE', name: 'Deutsch' },
  { code: 'fr', prefix: 'fr', hreflang: 'fr', tag: 'fr', og: 'fr_FR', name: 'Français' },
  { code: 'es', prefix: 'es', hreflang: 'es', tag: 'es', og: 'es_ES', name: 'Español' },
  { code: 'it', prefix: 'it', hreflang: 'it', tag: 'it', og: 'it_IT', name: 'Italiano' },
  { code: 'nl', prefix: 'nl', hreflang: 'nl', tag: 'nl', og: 'nl_NL', name: 'Nederlands' },
  { code: 'pl', prefix: 'pl', hreflang: 'pl', tag: 'pl', og: 'pl_PL', name: 'Polski' },
  { code: 'pt', prefix: 'pt', hreflang: 'pt-PT', tag: 'pt-PT', og: 'pt_PT', name: 'Português' },
  { code: 'ru', prefix: 'ru', hreflang: 'ru', tag: 'ru', og: 'ru_RU', name: 'Русский' },
  { code: 'sv', prefix: 'sv', hreflang: 'sv', tag: 'sv', og: 'sv_SE', name: 'Svenska' },
  { code: 'da', prefix: 'da', hreflang: 'da', tag: 'da', og: 'da_DK', name: 'Dansk' },
  { code: 'nb', prefix: 'no', hreflang: 'nb', tag: 'nb', og: 'nb_NO', name: 'Norsk' },
  { code: 'fi', prefix: 'fi', hreflang: 'fi', tag: 'fi', og: 'fi_FI', name: 'Suomi' },
] as const;

export type Locale = (typeof LANGS)[number];
export type Lang = Locale['code'];

export const DEFAULT_LANG: Lang = 'en';

export const X_DEFAULT = 'x-default';

export const localeOf = (lang: Lang): Locale => LANGS.find((l) => l.code === lang)!;

export const TRANSLATED_LANGS = LANGS.filter((l) => l.code !== DEFAULT_LANG);

// Another language's words in another script (Русский on a Latin page) take the system font, so the page never
// downloads a font for them.
const LATIN = /^[\p{Script=Latin}\s]+$/u;
export const otherScript = (other: Locale, page: Lang) => other.code !== page && !LATIN.test(other.name);

export const shortCode = (l: Locale) => (l.prefix || l.code).toUpperCase();
