import { defineCollection, z } from 'astro:content';

// The drafts also carry SEO brief fields (serp_format, sources, hero_prompt...). Zod strips those not declared here,
// so they never reach a page.
const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keyword: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    // Written from the finished image, in the guide's language. The files are named after the guide (guides.ts heroOf).
    hero_alt: z.string().min(1).max(125),
    hero_color: z.string().regex(/^#[0-9a-f]{6}$/),
    // seo/clusters.md letter, from the brief's "A. Route order and dates" or a bare "A". Same-cluster guides in other
    // languages link each other.
    cluster: z
      .string()
      .regex(/^[A-Z]\b/)
      .transform((cluster) => cluster[0])
      .optional(),
  }),
});

export const collections = { guides };
