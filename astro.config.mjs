import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://itsjavi.com",
  integrations: [mdx(), sitemap(), tailwind()],
  scopedStyleStrategy: "class",
});
