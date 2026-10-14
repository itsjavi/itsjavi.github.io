import { type CollectionEntry, getCollection } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** Published posts, newest first. Drafts show up in `astro dev` only. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", (p) => import.meta.env.DEV || !p.data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingTime(body = "") {
  const words = body
    .replace(/<[^>]+>|[#*_`>[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 230))} min`;
}

/** The post's description, or its first paragraph of plain text. */
export function postDescription(post: Post) {
  if (post.data.description) return post.data.description;
  const paragraph = (post.body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|<|!\[|```|import |export )/.test(p));
  const text = (paragraph ?? "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ");
  return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
}
