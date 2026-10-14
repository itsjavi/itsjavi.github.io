// Creates a draft post: pnpm new:post "Post title"
import { existsSync, writeFileSync } from "node:fs";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('Usage: pnpm new:post "Post title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const file = `src/content/blog/${slug}.md`;
if (existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync(
  file,
  `---
title: ${JSON.stringify(title)}
pubDate: ${date}
tags: []
# Project ids this post is about, e.g. [notemd]
projects: []
draft: true
---

Write the first paragraph here. It doubles as the description unless you set one.
`,
);
console.log(`Created ${file} (draft). Remove "draft: true" to publish.`);
