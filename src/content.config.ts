import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    // Falls back to the first paragraph of the post.
    description: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // Project ids this post is about; the post is listed on their pages.
    projects: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Giscus discussion term, to keep comments when a post moves to a new URL.
    discussion: z.string().optional(),
  }),
});

// One file per project. Versions, dates and release notes come from GitHub or npm at build time.
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: z
    .object({
      name: z.string(),
      tagline: z.string(),
      description: z.string(),
      // Retired projects keep their page but are never listed or linked out.
      status: z.enum(["active", "retired"]).default("active"),
      shelf: z.enum(["apps", "tools", "libs"]).optional(),
      kind: z.string(),
      category: z.string().optional(),
      order: z.number().default(100),
      // File name in src/assets/icons. Glyph-style icons get a tile background.
      icon: z.string().optional(),
      iconTile: z.string().optional(),
      iconPixelated: z.boolean().default(false),
      // Libraries without an icon get a monogram tile.
      monogram: z.string().optional(),
      hue: z.number().default(220),
      // Paths relative to src/assets/projects.
      screenshots: z.array(z.string()).default([]),
      repo: z.string().optional(),
      npm: z.string().optional(),
      website: z.url().optional(),
      download: z.url().optional(),
      docs: z.url().optional(),
      action: z.enum(["download", "build", "open", "visit", "docs", "install"]).optional(),
      requires: z.string().optional(),
      platforms: z.string().optional(),
      license: z.string().optional(),
      price: z.string().optional(),
      size: z.string().optional(),
      badge: z.string().optional(),
      // Candidates for the home page's featured cards; the most recently released two win.
      featured: z.boolean().default(false),
      color: z.string().optional(),
      featureText: z.string().optional(),
      // Shown in the GitHub profile README.
      readme: z.boolean().default(false),
      readmeTagline: z.string().optional(),
      // Legacy cover image for retired project pages.
      img: z.string().optional(),
      pubDate: z.coerce.date().optional(),
    })
    .refine((p) => p.status === "retired" || p.shelf, {
      message: "Active projects need a shelf",
      path: ["shelf"],
    }),
});

export const collections = { blog, projects };
