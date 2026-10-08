import en from './en';
import de from './de';
import fr from './fr';
import es from './es';
import it from './it';
import nl from './nl';
import pl from './pl';
import pt from './pt';
import ru from './ru';
import sv from './sv';
import da from './da';
import nb from './nb';
import fi from './fi';
import { localeOf, type Lang } from './locales';
import { fill, plural, type Plural, type Vars } from './text';

export type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, de, fr, es, it, nl, pl, pt, ru, sv, da, nb, fi };

export function useLang(lang: Lang) {
  const { tag } = localeOf(lang);
  return {
    t: DICTS[lang],
    tag,
    fmt: {
      text: fill,
      plural: (forms: Plural, n: number, vars?: Vars) => plural(tag, forms, n, vars),
      date: (date: Date, options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(tag, { timeZone: 'UTC', ...options }).format(date),
      money: (amount: number, currency: string) => new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount),
    },
  };
}

export { DEFAULT_LANG, LANGS, TRANSLATED_LANGS, localeOf, otherScript, shortCode, type Lang } from './locales';
