import type { LegalSection } from './types';

// The layout numbers sections by their order, so cross-references are derived from the same order.
export function legalSections<Id extends string>(ids: readonly Id[]) {
  const number = (id: Id) => ids.indexOf(id) + 1;
  return {
    number,
    ref: (id: Id) => `<a href="#${id}">Section ${number(id)}</a>`,
    build: (bodies: Record<Id, Omit<LegalSection, 'id'>>): LegalSection[] => ids.map((id) => ({ id, ...bodies[id] })),
  };
}
