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
import { CONTRACT_1_12 } from '../app';
import { overlay } from './edition';
import { localeOf, type Lang } from './locales';
import { fill, plural, type Plural, type Vars } from './text';

export type Dict = typeof en;

export const DICTIONARIES: Record<Lang, Dict> = { en, de, fr, es, it, nl, pl, pt, ru, sv, da, nb, fi };

// The one place that picks 1.0 or v2 copy (spec 016): the v2 block replaces its keys while CONTRACT_1_12 is on.
export const editionOf = (dict: Dict, v2: boolean): Dict => (v2 ? overlay<Dict>(dict, dict.v2) : dict);

const EDITIONS = Object.fromEntries(
  Object.entries(DICTIONARIES).map(([lang, dict]) => [lang, editionOf(dict, CONTRACT_1_12)]),
) as Record<Lang, Dict>;

export function useLang(lang: Lang) {
  const { tag } = localeOf(lang);
  return {
    t: EDITIONS[lang],
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
