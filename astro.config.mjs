// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { readdirSync, readFileSync } from "node:fs";

// Retired project pages stay online but are kept out of the sitemap.
const projectsDir = new URL("./src/content/projects/", import.meta.url);
const retired = readdirSync(projectsDir)
  .filter((file) =>
    /^status:\s*retired\s*$/m.test(readFileSync(new URL(file, projectsDir), "utf8")),
  )
  .map((file) => `/projects/${file.replace(/\.mdx?$/, "")}/`);

export default defineConfig({
  site: "https://itsjavi.com",
  trailingSlash: "ignore",
  redirects: {
    "/cv": "/about/",
    "/projects/new-css-logo": "/blog/new-css-logo/",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !retired.includes(path) && !path.startsWith("/editor/fullscreen");
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
