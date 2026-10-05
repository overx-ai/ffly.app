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

export const fill = (template: string, vars: Vars = {}) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));

export function plural(tag: string, forms: Plural, n: number, vars: Vars = {}): string {
  const form = forms[new Intl.PluralRules(tag).select(n)] ?? forms.other;
  return fill(form, { n, ...vars });
}
