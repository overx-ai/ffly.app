import { APP, APP_STORE_URL, DEVELOPER, PUBLISHER } from './app';
import type { HowTo } from './guide-markdown';
import { DEFAULT_LANG, localeOf, useLang, type Lang } from './i18n';
import { DEFAULT_OG_IMAGE, isoDate, siteOrigin, urlFor, type Slug } from './site-pages';

// No offers.price and no aggregateRating. Prices are territory-set and the app has no
// ratings yet, so quoting either would be a claim the store does not back.

const overx = { '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url };
const developer = { '@type': 'Person', name: DEVELOPER, url: PUBLISHER.url };
const appIcon = `${siteOrigin}/icon-512.png`;

export interface Crumb {
  name: string;
  slug: Slug;
}

export function appSchema(lang: Lang = DEFAULT_LANG) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: APP.storeName,
    operatingSystem: `iOS ${APP.minimumOs} or later`,
    applicationCategory: 'TravelApplication',
    url: urlFor('', lang),
    inLanguage: localeOf(lang).tag,
    image: appIcon,
    ...(APP_STORE_URL ? { installUrl: APP_STORE_URL, downloadUrl: APP_STORE_URL } : {}),
    author: developer,
    creator: overx,
    publisher: overx,
    featureList: useLang(lang).t.schema.featureList,
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP.name,
    url: urlFor(''),
    logo: appIcon,
    parentOrganization: overx,
  };
}

export function websiteSchema(lang: Lang = DEFAULT_LANG) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP.name,
    url: urlFor('', lang),
    inLanguage: localeOf(lang).tag,
    creator: overx,
  };
}

export function breadcrumb(name: string, slug: Slug, parent?: Crumb, lang: Lang = DEFAULT_LANG) {
  const items: Crumb[] = [{ name: useLang(lang).t.schema.home, slug: '' }, ...(parent ? [parent] : []), { name, slug }];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: urlFor(it.slug, lang),
    })),
  };
}

export function faqSchema(items: readonly { question: string; answer: string }[], lang: Lang = DEFAULT_LANG) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: localeOf(lang).tag,
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
    mainEntityOfPage: { '@type': 'WebPage', '@id': urlFor(article.slug) },
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
