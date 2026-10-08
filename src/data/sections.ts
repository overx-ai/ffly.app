import type { LegalSection } from './types';

// Owner, 2026-10-08: no page shows a postal address or a phone number; the address is given by email on request.
export const ADDRESS_ON_REQUEST = 'We will give you our postal address on request: email us.';

// The layout numbers sections by their order, so cross-references are derived from the same order.
export function legalSections<Id extends string>(ids: readonly Id[]) {
  const number = (id: Id) => ids.indexOf(id) + 1;
  return {
    number,
    ref: (id: Id) => `<a href="#${id}">Section ${number(id)}</a>`,
    build: (bodies: Record<Id, Omit<LegalSection, 'id'>>): LegalSection[] => ids.map((id) => ({ id, ...bodies[id] })),
  };
}
