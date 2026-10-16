import { isPlural, type Plural } from './text';

// Spec 016: a dictionary's `v2` block holds the copy of the v2 money model, in the dictionary's own shape. A plural or a
// list is replaced whole, so no 1.0 plural form survives under a v2 one.
export type Override<T> = {
  [K in keyof T]?: T[K] extends string | Plural | readonly unknown[] ? T[K] : Override<T[K]>;
};

const isBranch = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !isPlural(value);

export function overlay<T>(base: T, top: Override<T> | undefined): T {
  if (top === undefined) return base;
  if (!isBranch(base) || !isBranch(top)) return top as T;
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, overlay(value, top[key] as Override<unknown>)]),
  ) as T;
}
