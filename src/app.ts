// Every fact about the app lives here. Pages must not hardcode any of it.
// Source of truth: ../../0E-extensions/ios-ffly (fastlane/metadata/en-US, PrivacyInfo.xcprivacy,
// docs/compliance/data-inventory.yaml) and the ffly API in 1B-bots apps/ffly-api.
import type { Provider } from './server/auth-session';

export const APP = {
  name: 'ffly',
  storeName: 'ffly',
  proName: 'ffly Pro',
  lifetimeName: 'Lifetime',
  minimumOs: '17.0',
  freeSearches: 3,
  savedTrips: 20,
} as const;

// A real search, not a promise: ios-ffly docs/specs/001 "Verification (2026-10-02)", the default
// trip against the live API. Always shown labelled as an example; never restate it as a saving.
export const EXAMPLE_TRIP = {
  searchedOn: '2026-10-02',
  start: 'Warsaw',
  finish: 'Warsaw or Vilnius',
  routesFound: 6,
  bestTotal: 129.62,
  currency: 'EUR',
  stops: [
    { city: 'Warsaw', code: 'WAW' },
    { city: 'Madrid', code: 'MAD', nights: 2 },
    { city: 'Amsterdam', code: 'AMS', nights: 2 },
    { city: 'Rome', code: 'FCO', nights: 4 },
    { city: 'Warsaw', code: 'WAW' },
  ],
} as const;

// TODO(owner): set the numeric App Store id once App Store Connect has the app record. Until then
// the badge renders as "Coming soon", and the Smart App Banner and installUrl are omitted: a dead
// store link is worse than none.
export const APP_STORE_ID: string | undefined = undefined;
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : undefined;

// The domain as named in copy. Not the build's `site` (astro.config.mjs), which PUBLIC_SITE_URL overrides.
export const SITE_HOST = 'ffly.app';

// The controller of personal data on /privacy and the trader on /terms: a person, never a company name (owner, 2026-10-07).
export const OPERATOR = 'Yauheni Malashchytski';
export const OPERATOR_COUNTRY = 'Belarus';
// TODO(owner): spec 011. GDPR and UK GDPR Art. 27 representatives (name and postal address of each). Empty = none appointed
// yet (owner, 2026-10-07): /privacy then leaves the section out rather than claim one. REPLACE_ME fails `npm test`.
export const EU_REPRESENTATIVE = '';
export const UK_REPRESENTATIVE = '';
export const GOVERNING_LAW = 'the Republic of Belarus';
export const DEVELOPER = 'Yauheni Malashchytski';
export const PUBLISHER = { name: 'OverX AI', label: 'overx.ai', url: 'https://overx.ai' } as const;

// One address for support, contact and privacy requests, as on the sibling sites.
export const CONTACT_EMAIL = 'support@overx.ai';

export const SERVICE = {
  apiHost: 'api.overx.ai',
  authHost: 'auth.overx.ai',
  searchRetentionHours: 24,
} as const;

export const FFLY_API_BASE = `https://${SERVICE.apiHost}/ffly`;

// ffly API contract 1.12.0 (1B-bots spec 574): sign-in, per-leg offers, the Pro teaser and the Trip kit (spec 014),
// and the search options the web may send from 1.12.0 (spec 015), and the v2 copy edition (spec 016). On since
// 2026-10-16, with ffly-api tiers v2 (founder: the web runs v2 now). Sign-in still waits for a ready provider.
export const CONTRACT_1_12: boolean = true;

// Sign in with Apple or Google on the web search (spec 014). The page hands the provider's token to this site's own
// /api/auth routes, which trade it at overx-auth and keep only its refresh token, in an HttpOnly cookie; the access
// token lives in page memory. Public ids only, no secret. Each provider goes live on its own (spec 016). TODO(owner):
// set appleRegistered once the Services ID and its return URL are registered (1B-bots spec 573 T1), and googleClientId
// to the "ffly web" OAuth client (573 T2), each with its CSP hosts in vercel.json (npm test names them).
export const AUTH = {
  base: `https://${SERVICE.authHost}`,
  routes: '/api/auth',
  appleServiceId: 'ai.overx.ffly.web',
  appleRegistered: false as boolean,
  appleReturnUrl: `https://${SITE_HOST}/auth/apple`,
  googleClientId: undefined as string | undefined,
  cookie: 'ffly_session',
  days: 180,
  refreshSkewS: 60,
  timeoutMs: 8000,
  hintKey: 'ffly.account',
} as const;
export function signInProviders(contract: boolean, auth: Pick<typeof AUTH, 'appleServiceId' | 'appleRegistered' | 'googleClientId'>): Provider[] {
  if (!contract) return [];
  const ready: Record<Provider, boolean> = { apple: Boolean(auth.appleServiceId) && auth.appleRegistered, google: Boolean(auth.googleClientId) };
  return (['apple', 'google'] as const).filter((provider) => ready[provider]);
}
export const SIGN_IN_PROVIDERS = signInProviders(CONTRACT_1_12, AUTH);
export const SIGN_IN = SIGN_IN_PROVIDERS.length > 0;
export const APPLE_JS = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
export const GOOGLE_JS = 'https://accounts.google.com/gsi/client';

// GA4 events of the web search (specs 014 and 015), sent only after Accept. Their params name a placement, an offer kind
// or kit category, a rating and the tier; never a city, date, price or account.
export const EVENTS = { book: 'book_click', kit: 'kit_click', rate: 'search_rating' } as const;

// Contract caps of a search request (ffly API SearchRequest, unchanged by 1.12.0), never plan limits: those come only
// from /meta. tests/contract/ffly-api-parity.test.ts reads them back from the pinned schema.
export const REQUEST_LIMITS = {
  pins: 5,
  excluded: 50,
  stopsPerLeg: 3,
  stopsTotal: 6,
  minAdults: 1,
  seated: 9,
  sourceLength: 32,
} as const;

// Flight hours (spec 015), as the app's Settings: a time list in quarter hours, the API's own defaults shown until the
// visitor picks one. Only the short-leg fields are sent; the long-leg ones keep the API's defaults.
export const FLIGHT_HOURS = { stepMinutes: 15, from: '10:00', to: '22:00' } as const;

// Saved routes, history, passports and ratings (spec 015): this browser's own, in localStorage, never sent.
export const LIBRARY = {
  savedKey: 'ffly.saved',
  historyKey: 'ffly.history',
  passportsKey: 'ffly.passports',
  ratingsKey: 'ffly.ratings',
  maxSaved: 50,
  maxHistory: 20,
  maxRatings: 50,
  compareMin: 2,
  compareMax: 3,
  stars: 5,
  // The app's rating policy: one to three stars ask what went wrong.
  lowStars: 3,
} as const;

// The app's MIT-licensed Passport Index table (ios-ffly spec 029, notice in public/visa-LICENSE.txt), fetched only once
// a passport is set.
export const VISA = { url: '/visa.json' } as const;

// The app's offline feedback queue (ios-ffly FeedbackQueueRules.expiry): an unsent message is dropped after this.
export const FEEDBACK = {
  queuedDays: 7,
} as const;

// The web search on / (#search) and /search (src/scripts/search.ts), an anonymous Free caller of FFLY_API_BASE.
export const WEB_SEARCH = {
  pollMs: 2000,
  requestTimeoutMs: 15000,
  pollRetries: 3,
  pollRetryBaseMs: 2000,
  storageKey: 'ffly.search',
  placesKey: 'ffly.places',
  placesUrl: '/places.json',
  startInDays: 21,
  windowDays: 7,
  minNights: 2,
  maxNights: 4,
  placeMatches: 8,
  nudgeMs: 5000,
  earlyBefore: '07:00',
  lateFrom: '23:00',
} as const;

// The "this page is in your language" hint (spec 012) stops once the visitor dismisses it or picks a language.
export const LANG_HINT = {
  storageKey: 'ffly.lang',
  dismissed: 'dismissed',
} as const;

// The hero button and the header "Search" glide to #search over this long (instant under reduced motion).
export const SCROLL_MS = 1200;

// First-party functional cookies of the web search. Dates are never stored.
export const PREFS = {
  from: { cookie: 'ffly_from', days: 365 },
  back: { cookie: 'ffly_back', days: 365 },
  cities: { cookie: 'ffly_cities', days: 30 },
  nudge: { cookie: 'ffly_nudge', days: 365 },
} as const;

export interface Pref {
  readonly cookie: string;
  readonly days: number;
}

export const WEB_NOTIFY = {
  icon: '/icon-192.png',
} as const;

// TODO(owner): set the AdSense publisher id (ca-pub-...) and the ad unit ids to turn ads on. While the client
// id is undefined, no consent or ad script loads and every AdSlot renders nothing.
export const ADSENSE_CLIENT: string | undefined = undefined;
export const AD_SLOTS: Record<'searchResults', string | undefined> = { searchResults: undefined };
export const AD_SIZES = {
  banner: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  mobile: { width: 320, height: 100 },
} as const;
export const CONSENT_SCRIPT = (client: string) => `https://fundingchoicesmessages.google.com/i/${client.replace(/^ca-/, '')}?ers=1`;
export const ADSENSE_SCRIPT = (client: string) => `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
// The flight booking partner's loader, injected by the consent module only after Accept (founder, 2026-10-15: the
// network's site verification is done, so it waits for consent like analytics). Undefined removes the script, its CSP
// host and its /privacy copy.
export const AD_NETWORK_SCRIPT: string | undefined = 'https://tpembars.com/NTgxNDYy.js?t=581462';

// Google Analytics 4, loaded only after Accept in the consent banner (src/scripts/consent.ts). Undefined turns
// off analytics; /privacy switches its copy on it too.
export const GA_MEASUREMENT_ID: string | undefined = 'G-JYLD2DWSJG';
// The visitor's choice, `granted` or `denied`, for every page of the site, stored with `revision`. Raise the revision
// whenever the banner gains a purpose: consent must be specific, so a choice stored before it is asked again.
export const CONSENT = { cookie: 'ffly_consent', days: 182, revision: 2 } as const satisfies Pref & { revision: number };
// The banner, the footer "Cookie settings" and the consent cookie exist while anything waits for consent.
export const CONSENT_NEEDED = Boolean(GA_MEASUREMENT_ID || AD_NETWORK_SCRIPT);
export const GTAG_SCRIPT = (id: string) => `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;

// The articles at /guides (src/content/guides).
export const GUIDES = {
  wordsPerMinute: 230,
} as const;

export const EXTERNAL = {
  appleEula: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  applePrivacy: 'https://www.apple.com/legal/privacy/',
  appleRefund: 'https://reportaproblem.apple.com',
  revenuecatPrivacy: 'https://www.revenuecat.com/privacy/',
  appsflyerPrivacy: 'https://www.appsflyer.com/legal/privacy-policy/',
  appsflyerOptout: 'https://www.appsflyer.com/optout',
  googlePrivacy: 'https://policies.google.com/privacy',
  googlePartnerSites: 'https://policies.google.com/technologies/partner-sites',
} as const;

export const mailto = (email: string) => `<a href="mailto:${email}">${email}</a>`;

export const externalLink = (url: string, label: string = url) =>
  `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
