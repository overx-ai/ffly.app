// Every fact about the app lives here. Pages must not hardcode any of it.
// Source of truth: ../../0E-extensions/ios-ffly (fastlane/metadata/en-US, PrivacyInfo.xcprivacy,
// docs/compliance/data-inventory.yaml) and the ffly API in 1B-bots apps/ffly-api.

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
export const OPERATOR_ADDRESS = '76 Galo Street, flat 91, Minsk, Belarus';
export const OPERATOR_PHONE = '+375 29 778 21 78';
// TODO(owner): spec 011. GDPR and UK GDPR Art. 27 representatives (name and postal address of each) and the governing
// law of /terms (a jurisdiction, e.g. "the Republic of Belarus"). scripts/check-legal.mjs fails `npm test` while any is
// REPLACE_ME, because the legal pages are not fit to publish without them.
export const EU_REPRESENTATIVE = 'REPLACE_ME';
export const UK_REPRESENTATIVE = 'REPLACE_ME';
export const GOVERNING_LAW = 'REPLACE_ME';
export const DEVELOPER = 'Yauheni Malashchytski';
export const PUBLISHER = { name: 'OverX AI', label: 'overx.ai', url: 'https://overx.ai' } as const;

// One address for support, contact and privacy requests, as on the sibling sites.
export const CONTACT_EMAIL = 'support@overx.ai';

export const SERVICE = {
  apiHost: 'api.overx.ai',
  searchRetentionHours: 24,
} as const;

export const FFLY_API_BASE = `https://${SERVICE.apiHost}/ffly`;

// The app's offline feedback queue (ios-ffly FeedbackQueueRules.expiry): an unsent message is dropped after this.
export const FEEDBACK = {
  queuedDays: 7,
} as const;

// The web search on / (#search) and /search (src/scripts/search.ts), an anonymous Free caller of FFLY_API_BASE.
export const WEB_SEARCH = {
  freeSearchesPerDay: 5,
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

// Google Analytics 4, loaded only after Accept in the consent banner (src/scripts/consent.ts). Undefined turns
// off the banner, the footer "Cookie settings" control and analytics; /privacy switches its copy on it too.
export const GA_MEASUREMENT_ID: string | undefined = 'G-JYLD2DWSJG';
// The visitor's choice, `granted` or `denied`, for every page of the site.
export const CONSENT = { cookie: 'ffly_consent', days: 182 } as const satisfies Pref;
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
