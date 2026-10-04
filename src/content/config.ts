import { defineCollection, z } from 'astro:content';

// The drafts also carry SEO brief fields (serp_format, sources, hero_prompt...). Zod strips them,
// so they never reach a page.
const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keyword: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
  }),
});

export const collections = { guides };
