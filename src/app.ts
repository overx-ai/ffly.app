// Every fact about the app lives here. Pages must not hardcode any of it.
// Source of truth: ../../0E-extensions/ios-ffly (fastlane/metadata/en-US, PrivacyInfo.xcprivacy,
// docs/compliance/data-inventory.yaml) and the ffly API in 1B-bots apps/ffly-api.

export const APP = {
  name: 'ffly',
  storeName: 'ffly',
  subtitle: 'Cheap multi-city trips',
  proName: 'ffly Pro',
  bundleId: 'ai.overx.ffly',
  minimumOs: '17.0',
  freeSearches: 3,
  maxCities: 8,
  maxEnds: 3,
  savedTrips: 20,
  airlines: ['Ryanair', 'Wizz Air', 'airBaltic'],
} as const;

// TODO(owner): set the numeric App Store id once App Store Connect has the app record. Until then
// the badge renders as "Coming soon", and the Smart App Banner and installUrl are omitted: a dead
// store link is worse than none.
export const APP_STORE_ID: string | undefined = undefined;
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : undefined;

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

export const EXTERNAL = {
  appleEula: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  applePrivacy: 'https://www.apple.com/legal/privacy/',
  revenueCatPrivacy: 'https://www.revenuecat.com/privacy',
  vercelPrivacy: 'https://vercel.com/legal/privacy-policy',
} as const;

export const LEGAL_EFFECTIVE_DATE = 'October 3, 2026';

export const mailto = (email: string) => `<a href="mailto:${email}">${email}</a>`;

export const externalLink = (url: string, label: string = url) =>
  `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
