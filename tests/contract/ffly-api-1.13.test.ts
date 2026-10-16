// Consumer contract for ffly API 1.13.0 (1B-bots spec 575, docs/PINS.md): /meta's search window. `meta.schema.json` is
// the published openapi.json's MetaResponse at 2c1201318, verbatim; `meta-web.json` is the live web answer of 2026-10-16.
import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en';
import { searchWindow, type Meta } from '../../src/scripts/ffly-api';
import { quotaNote, quotaSpent } from '../../src/scripts/quota';
import meta112 from '../fixtures/ffly-api-1.12/meta-free.json';
import metaPro from '../fixtures/ffly-api-1.13/meta-pro.json';
import metaWeb from '../fixtures/ffly-api-1.13/meta-web.json';
import pinned from '../fixtures/ffly-api-1.13/meta.schema.json';
import { schemaProblems, type Schema } from './json-schema';

const schemas = pinned.schemas as Record<string, Schema>;
const problems = schemaProblems(schemas);
const TEXT = en.widget.script.messages;

describe('/meta search window', () => {
  it('pins the fixtures to the published shape, which 1.12.0 lacks', () => {
    for (const [name, meta] of [['web', metaWeb], ['pro', metaPro]] as const) expect(problems(meta, schemas.MetaResponse, name)).toEqual([]);
    expect(problems(meta112, schemas.MetaResponse, '1.12')).toEqual(['1.12.tier_limits.searches_per_window: missing', '1.12.tier_limits.window_hours: missing']);
  });

  it('gives the web and Pro their window from the answer, never from the site', () => {
    expect(searchWindow((metaWeb as Meta).tier_limits)).toEqual({ searches: 10, hours: 12 });
    expect(searchWindow((metaPro as Meta).tier_limits)).toEqual({ searches: 100, hours: 24 });
    expect(searchWindow({ ...(metaWeb as Meta).tier_limits, searches_per_window: null, window_hours: null })).toBeUndefined();
  });

  it('counts what is left in the window and says when more come', () => {
    expect(quotaNote(metaWeb as Meta, false, TEXT, 'en-GB')).toBe('10 free web searches left.');
    expect(quotaSpent(metaWeb as Meta, TEXT, 'en-GB')).toBe("You've used your free web searches for now. More in up to 12 hours.");
    expect(quotaNote(metaPro as Meta, true, TEXT, 'en-GB')).toBe('');
  });
});
