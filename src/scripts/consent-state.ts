import { CONSENT } from '../app';
import { cookieString, parseCookies } from './prefs';

export const CHOICES = ['granted', 'denied'] as const;
export type Choice = (typeof CHOICES)[number];

const isChoice = (value: string | undefined): value is Choice => CHOICES.includes(value as Choice);

export function readChoice(cookieHeader: string): Choice | undefined {
  const value = parseCookies(cookieHeader).get(CONSENT.cookie);
  return isChoice(value) ? value : undefined;
}

// Global Privacy Control counts as Reject until the visitor chooses otherwise in Cookie settings (/privacy #ccpa).
export const initialChoice = (stored: Choice | undefined, globalPrivacyControl: boolean): Choice | undefined =>
  stored ?? (globalPrivacyControl ? 'denied' : undefined);

export const choiceCookie = (choice: Choice) => cookieString(CONSENT, choice);

export const shouldShowBanner = (measurementId: string | undefined, choice: Choice | undefined) =>
  Boolean(measurementId) && choice === undefined;

export const mustReload = (previous: Choice | undefined, next: Choice) => previous === 'granted' && next === 'denied';

const GA_COOKIE = /^_ga(?:_|$)/;

export const analyticsCookies = (cookieHeader: string) => [...parseCookies(cookieHeader).keys()].filter((name) => GA_COOKIE.test(name));

// GA sets its cookies on the highest domain the browser accepts (.ffly.app from www.ffly.app), so a cookie is
// deleted only by a write that repeats its domain: try the host-only form and every parent domain but the TLD.
export function expiryCookies(names: string[], hostname: string): string[] {
  const labels = hostname.split('.');
  const domains = labels.slice(0, -1).map((_, i) => labels.slice(i).join('.'));
  const scopes = ['', ...domains.map((domain) => `; Domain=.${domain}`)];
  return names.flatMap((name) => scopes.map((scope) => `${name}=; Max-Age=0; Path=/${scope}`));
}
