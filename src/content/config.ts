import { defineCollection, z } from "astro:content";
const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.string().optional(),
  heroImage: z.string().optional(),
  badge: z.string().optional(),
  tags: z
    .array(z.string())
    .refine((items) => new Set(items).size === items.length, {
      message: "tags must be unique",
    })
    .optional(),
});

const projectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  desc: z.string(),
  img: z.string(),
  url: z.string().optional(),
  badge: z.string().optional(),
});

const experimentSchema = z.object({
  title: z.string(),
  slug: z.string(),
  desc: z.string(),
  img: z.string(),
  codepenUser: z.string(),
  codepenId: z.string(),
});

export type BlogSchema = z.infer<typeof blogSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;
export type ExperimentSchema = z.infer<typeof experimentSchema>;

const blogCollection = defineCollection({ schema: blogSchema });
const projectCollection = defineCollection({ schema: projectSchema });
const experimentCollection = defineCollection({ schema: experimentSchema });

export const collections = {
  blog: blogCollection,
  project: projectCollection,
  experiment: experimentCollection,
};
