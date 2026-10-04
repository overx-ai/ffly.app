import { APP, APP_STORE_URL, DEVELOPER, PUBLISHER } from './app';

// No offers.price and no aggregateRating. Prices are territory-set and the app has no
// ratings yet, so quoting either would be a claim the store does not back.

const overx = { '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url };

export function appSchema(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: APP.storeName,
    operatingSystem: `iOS ${APP.minimumOs} or later`,
    applicationCategory: 'TravelApplication',
    url: `${site}/`,
    image: `${site}/icon-512.png`,
    ...(APP_STORE_URL ? { installUrl: APP_STORE_URL, downloadUrl: APP_STORE_URL } : {}),
    author: { '@type': 'Person', name: DEVELOPER, url: PUBLISHER.url },
    creator: overx,
    publisher: overx,
    featureList: [
      'Finds the cheapest order and dates for a multi-city trip',
      'Schedule-aware routes that favour sensible flight times',
      `Fares from ${APP.airlines.join(', ')} and more`,
      "Booking links to the airline's own website",
    ],
  };
}

export function organizationSchema(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP.name,
    url: `${site}/`,
    logo: `${site}/icon-512.png`,
    parentOrganization: overx,
  };
}

export function websiteSchema(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP.name,
    url: `${site}/`,
    creator: overx,
  };
}

export function breadcrumb(site: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${site}${it.path}`,
    })),
  };
}

export function faqSchema(items: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      },
    })),
  };
}
