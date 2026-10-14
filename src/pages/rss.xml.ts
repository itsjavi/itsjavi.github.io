import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE } from "../config";
import { getPosts, postDescription } from "../lib/posts";

export async function GET(context: APIContext) {
  const posts = (await getPosts()).filter((post) => !post.data.draft);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? "https://itsjavi.com",
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: postDescription(post),
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
