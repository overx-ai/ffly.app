import { APP, APP_STORE_URL, DEVELOPER, PUBLISHER } from './app';
import type { HowTo } from './guide-markdown';
import { DEFAULT_OG_IMAGE, isoDate, pathFor, siteOrigin, type Slug } from './site-pages';

// No offers.price and no aggregateRating. Prices are territory-set and the app has no
// ratings yet, so quoting either would be a claim the store does not back.

const overx = { '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url };
const developer = { '@type': 'Person', name: DEVELOPER, url: PUBLISHER.url };

export interface Crumb {
  name: string;
  slug: Slug;
}

export function appSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: APP.storeName,
    operatingSystem: `iOS ${APP.minimumOs} or later`,
    applicationCategory: 'TravelApplication',
    url: `${siteOrigin}/`,
    image: `${siteOrigin}/icon-512.png`,
    ...(APP_STORE_URL ? { installUrl: APP_STORE_URL, downloadUrl: APP_STORE_URL } : {}),
    author: developer,
    creator: overx,
    publisher: overx,
    featureList: [
      'The cheapest order and dates for a trip to several cities',
      'Favours sensible flight times over pre-dawn wake-ups and midnight landings',
      `Fares from ${APP.airlines.join(', ')} and more`,
      'Routes ranked by what matters to you: schedule, price or a balance',
      "Book each flight on the airline's site or a booking site",
    ],
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP.name,
    url: `${siteOrigin}/`,
    logo: `${siteOrigin}/icon-512.png`,
    parentOrganization: overx,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP.name,
    url: `${siteOrigin}/`,
    creator: overx,
  };
}

export function breadcrumb(name: string, slug: Slug, parent?: Crumb) {
  const items: Crumb[] = [{ name: 'Home', slug: '' }, ...(parent ? [parent] : []), { name, slug }];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${siteOrigin}${pathFor(it.slug)}`,
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

export function articleSchema(article: {
  headline: string;
  description: string;
  slug: Slug;
  published: Date;
  updated: Date;
}) {
  const url = `${siteOrigin}${pathFor(article.slug)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    image: `${siteOrigin}${DEFAULT_OG_IMAGE}`,
    author: developer,
    publisher: overx,
    datePublished: isoDate(article.published),
    dateModified: isoDate(article.updated),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

export function howToSchema(howTo: HowTo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    step: howTo.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
