import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LANG, LANGS, localeOf, type Lang } from './i18n/locales';
import { GUIDES_INDEX, isSlug, type Slug } from './site-pages';

export type Guide = CollectionEntry<'guides'>;

export { GUIDES_INDEX };

// Guides are written natively (spec 018), each in src/content/guides/{code}/ and served under that language's prefix.
export const GUIDE_LANGS: readonly Lang[] = LANGS.map((l) => l.code);

export function guideLang(guide: Guide): Lang {
  const folder = guide.id.split('/')[0];
  const lang = GUIDE_LANGS.find((l) => l === folder);
  if (!lang) throw new Error(`${guide.id}: guides live in src/content/guides/{${GUIDE_LANGS.join(',')}}/`);
  return lang;
}

// A frontmatter `slug` replaces Astro's folder-prefixed one, so only the last segment is the URL name.
export const guideName = (guide: Guide) => guide.slug.split('/').pop()!;

export const getGuides = async (lang: Lang = DEFAULT_LANG) =>
  (await getCollection('guides', (guide) => guideLang(guide) === lang)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.data.title.localeCompare(b.data.title),
  );

// The same-cluster guides written in the other languages.
export const clusterSiblings = async (guide: Guide) =>
  guide.data.cluster === undefined
    ? []
    : getCollection('guides', (other) => other.data.cluster === guide.data.cluster && guideLang(other) !== guideLang(guide));

export function guidePageSlug(guide: Guide): Slug {
  const slug = [localeOf(guideLang(guide)).prefix, GUIDES_INDEX, guideName(guide)].filter(Boolean).join('/');
  if (!isSlug(slug)) throw new Error(`${slug} is not registered in SITE_PAGES`);
  return slug;
}
