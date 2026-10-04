import { getCollection, type CollectionEntry } from 'astro:content';
import { isSlug, type Slug } from './site-pages';

export type Guide = CollectionEntry<'guides'>;

export const GUIDES_INDEX = 'guides' satisfies Slug;

export const getGuides = async () =>
  (await getCollection('guides')).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.data.title.localeCompare(b.data.title),
  );

export function guidePageSlug(guide: Guide): Slug {
  const slug = `${GUIDES_INDEX}/${guide.slug}`;
  if (!isSlug(slug)) throw new Error(`${slug} is not registered in SITE_PAGES`);
  return slug;
}
