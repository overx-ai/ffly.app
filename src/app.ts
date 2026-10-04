// Every fact about the app lives here. Pages must not hardcode any of it.
// Source of truth: ../../0E-extensions/ios-ffly (fastlane/metadata/en-US, PrivacyInfo.xcprivacy,
// docs/compliance/data-inventory.yaml) and the ffly API in 1B-bots apps/ffly-api.

export const APP = {
  name: 'ffly',
  storeName: 'ffly',
  subtitle: 'Cheap multi-city trips',
  proName: 'ffly Pro',
  lifetimeName: 'Lifetime',
  minimumOs: '17.0',
  freeSearches: 3,
  savedTrips: 20,
  airlines: ['Ryanair', 'Wizz Air', 'airBaltic', 'Volotea'],
} as const;

// The priorities the API ranks by (1B-bots apps/ffly-api constants.PRIORITY_PRESETS labels).
export const PRIORITIES = ['Best schedule', 'Balanced', 'Cheapest'] as const;

// A real search, not a promise: ios-ffly docs/specs/001 "Verification (2026-10-02)", the default
// trip against the live API. Always shown labelled as an example; never restate it as a saving.
export const EXAMPLE_TRIP = {
  searchedOn: '2026-10-02',
  start: 'Warsaw',
  finish: 'Warsaw or Vilnius',
  routesFound: 6,
  bestTotal: '€129.62',
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

export const OPERATOR = 'Yauheni Malashchytski, trading as OverX AI';
export const DEVELOPER = 'Yauheni Malashchytski';
export const PUBLISHER = { name: 'OverX AI', label: 'overx.ai', url: 'https://overx.ai' } as const;

// One address for support, contact and privacy requests, as on the sibling sites.
export const CONTACT_EMAIL = 'support@overx.ai';

export const SERVICE = {
  apiHost: 'api.overx.ai',
  analyticsHost: 'analytics.overx.ai',
  searchRetentionHours: 24,
  entitlementCacheMinutes: 10,
} as const;

export const FFLY_API_BASE = `https://${SERVICE.apiHost}/ffly`;

// The in-app feedback form (ios-ffly spec 012): OverX's form-aggregator, and the app's offline queue
// (FeedbackQueueRules). form-aggregator has no retention job, so there is no retention figure here.
export const FEEDBACK = {
  serviceHost: `${SERVICE.apiHost}/forms`,
  queuedMessages: 20,
  queuedDays: 7,
} as const;

// The web search at /search (src/scripts/search.ts), an anonymous Free caller of FFLY_API_BASE.
export const WEB_SEARCH = {
  platform: 'web',
  freeSearchesPerDay: 1,
  pollMs: 2000,
  requestTimeoutMs: 15000,
  pollRetries: 3,
  pollRetryBaseMs: 2000,
  storageKey: 'ffly.search',
  locale: 'en-GB',
  startInDays: 21,
  windowDays: 7,
  minNights: 2,
  maxNights: 4,
} as const;

// The articles at /guides (src/content/guides).
export const GUIDES = {
  wordsPerMinute: 230,
  dateLocale: 'en-GB',
} as const;

export const EXTERNAL = {
  appleEula: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  applePrivacy: 'https://www.apple.com/legal/privacy/',
  appleRefund: 'https://reportaproblem.apple.com',
  revenueCatPrivacy: 'https://www.revenuecat.com/privacy',
  telegramPrivacy: 'https://telegram.org/privacy',
  vercelPrivacy: 'https://vercel.com/legal/privacy-policy',
} as const;

export const mailto = (email: string) => `<a href="mailto:${email}">${email}</a>`;

export const externalLink = (url: string, label: string = url) =>
  `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
