import { describe, expect, it } from 'vitest';
import { APPLE_JS, AUTH, CONTRACT_1_12, GOOGLE_JS, SIGN_IN_PROVIDERS, signInProviders } from '../src/app';
import APP_SOURCE from '../src/app.ts?raw';
import { PROVIDER_CSP, readyProviders } from '../scripts/sign-in.mjs';

const NONE = { appleServiceId: AUTH.appleServiceId, appleRegistered: false, googleClientId: undefined };
const GOOGLE_ID = 'ffly-web.apps.googleusercontent.com';

describe('sign-in providers', () => {
  it('go live one by one, so Apple needs no Google client and the other way round', () => {
    expect(signInProviders(true, { ...NONE, appleRegistered: true })).toEqual(['apple']);
    expect(signInProviders(true, { ...NONE, googleClientId: GOOGLE_ID })).toEqual(['google']);
    expect(signInProviders(true, { ...NONE, appleRegistered: true, googleClientId: GOOGLE_ID })).toEqual(['apple', 'google']);
    expect(signInProviders(true, NONE)).toEqual([]);
    expect(signInProviders(false, { ...NONE, appleRegistered: true, googleClientId: GOOGLE_ID })).toEqual([]);
  });

  it('read the same in check-legal as on the site', () => {
    const auth = APP_SOURCE.match(/export const AUTH\b[^=]*=\s*([^;]+);/)![1];
    expect(readyProviders(CONTRACT_1_12, auth)).toEqual(SIGN_IN_PROVIDERS);
    const only = (apple: boolean, google: string) =>
      auth.replace(/appleRegistered: \w+/, `appleRegistered: ${apple}`).replace(/googleClientId: [^,]+,/, `googleClientId: ${google},`);
    expect(readyProviders(true, only(true, 'undefined'))).toEqual(['apple']);
    expect(readyProviders(true, only(false, `'${GOOGLE_ID}'`))).toEqual(['google']);
  });

  it("open each provider's own script host, and Apple none of Google's", () => {
    expect(PROVIDER_CSP.apple['script-src']).toEqual([new URL(APPLE_JS).host]);
    expect(PROVIDER_CSP.google['script-src']).toEqual([new URL(GOOGLE_JS).host]);
    expect(Object.values(PROVIDER_CSP.apple).flat()).not.toContain(new URL(GOOGLE_JS).host);
  });
});
