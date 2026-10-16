// DOM-free and dictionary-free, so the search bundle can import it without pulling in any language.

export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type Vars = Record<string, string | number>;

const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

export const isPlural = (value: unknown): value is Plural =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as Plural).other === 'string' &&
  Object.keys(value).every((key) => PLURAL_FORMS.has(key));

// A value that ends in an abbreviation's full stop ("22. Nov.") swallows the template's own one after it.
export const fill = (template: string, vars: Vars = {}) =>
  template.replace(/\{(\w+)\}(\.?)/g, (match, key: string, stop: string) => {
    if (!(key in vars)) return match;
    const value = String(vars[key]);
    return stop && value.endsWith('.') ? value : value + stop;
  });

export function plural(tag: string, forms: Plural, n: number, vars: Vars = {}): string {
  const form = forms[new Intl.PluralRules(tag).select(n)] ?? forms.other;
  return fill(form, { n, ...vars });
}
