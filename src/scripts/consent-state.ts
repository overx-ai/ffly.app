import { CONSENT } from '../app';
import { cookieString, parseCookies } from './prefs';

export const CHOICES = ['granted', 'denied'] as const;
export type Choice = (typeof CHOICES)[number];

const cookieValue = (choice: Choice) => `${choice}.${CONSENT.revision}`;

export function readChoice(cookieHeader: string): Choice | undefined {
  const value = parseCookies(cookieHeader).get(CONSENT.cookie);
  return CHOICES.find((choice) => cookieValue(choice) === value);
}

// Global Privacy Control counts as Reject until the visitor chooses otherwise in Cookie settings (/privacy #ccpa).
export const initialChoice = (stored: Choice | undefined, globalPrivacyControl: boolean): Choice | undefined =>
  stored ?? (globalPrivacyControl ? 'denied' : undefined);

export const choiceCookie = (choice: Choice) => cookieString(CONSENT, cookieValue(choice));

export const shouldShowBanner = (consentNeeded: boolean, choice: Choice | undefined) => consentNeeded && choice === undefined;

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

export type Gtag = (...args: unknown[]) => void;
let gtag: Gtag | undefined;

// Set by the consent module once Accept has started Google Analytics; until then nothing can be measured.
export const setAnalytics = (next: Gtag) => {
  gtag = next;
};
export const analytics = () => gtag;
