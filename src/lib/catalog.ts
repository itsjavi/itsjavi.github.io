import type { ImageMetadata } from "astro";
import { type CollectionEntry, getCollection } from "astro:content";
import { getLatestRelease, type Release } from "./releases";

export type Project = CollectionEntry<"projects">;
export type CatalogItem = Project & { release: Release | null };
export type Shelf = "apps" | "tools" | "libs";

export const SHELVES: Record<Shelf, { title: string; note?: string }> = {
  apps: { title: "Mac apps", note: "Native, open source, macOS 26+" },
  tools: { title: "Tools and websites" },
  libs: { title: "Frameworks and libraries", note: "On npm" },
};

const icons = import.meta.glob<ImageMetadata>("../assets/icons/*.{png,svg}", {
  eager: true,
  import: "default",
});
const screenshots = import.meta.glob<ImageMetadata>("../assets/projects/**/*.{png,webp,jpg}", {
  eager: true,
  import: "default",
});

export function iconImage(file?: string) {
  return file ? icons[`../assets/icons/${file}`] : undefined;
}

export function screenshotImages(project: Project) {
  return project.data.screenshots.map((path) => {
    const image = screenshots[`../assets/projects/${path}`];
    if (!image) throw new Error(`Missing screenshot ${path} for ${project.id}`);
    return image;
  });
}

let catalog: Promise<CatalogItem[]> | undefined;

/** Active projects with their latest release, in display order. */
export function getCatalog(): Promise<CatalogItem[]> {
  catalog ??= (async () => {
    const projects = await getCollection("projects", (p) => p.data.status === "active");
    const items = await Promise.all(
      projects.map(async (p) => ({
        ...p,
        release: await getLatestRelease(p.data.repo, p.data.npm),
      })),
    );
    return items.sort(
      (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name),
    );
  })();
  return catalog;
}

export async function getShelf(shelf: Shelf) {
  return (await getCatalog()).filter((p) => p.data.shelf === shelf);
}

const DAY = 24 * 60 * 60 * 1000;

/** Explicit badge first; otherwise "Updated" for a release in the last three weeks. */
export function badgeFor(item: CatalogItem) {
  if (item.data.badge) return item.data.badge;
  if (item.release && Date.now() - item.release.date.valueOf() < 21 * DAY) return "Updated";
  return undefined;
}

/** The two featured projects with the most recent releases. */
export async function getFeatured() {
  const featured = (await getCatalog()).filter((p) => p.data.featured);
  return featured
    .sort((a, b) => (b.release?.date.valueOf() ?? 0) - (a.release?.date.valueOf() ?? 0))
    .slice(0, 2);
}

export function isRecent(release: Release | null, days = 30) {
  return !!release && Date.now() - release.date.valueOf() < days * DAY;
}

export function shortVersion(version: string) {
  const [major, minor = "0"] = version.split(".");
  return minor === "0" && Number(major) > 0 ? major : `${major}.${minor}`;
}

export const formatDate = (date: Date, style: "short" | "long" = "short") =>
  new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    month: "short",
    day: "numeric",
    ...(style === "long" ? { year: "numeric" } : {}),
  }).format(date);

export function primaryAction(item: CatalogItem): { label: string; href: string } | undefined {
  const d = item.data;
  const repoUrl = d.repo ? `https://github.com/${d.repo}` : undefined;
  switch (d.action) {
    case "download":
      return { label: "Download", href: d.download ?? `${repoUrl}/releases/latest` };
    case "build":
      return repoUrl ? { label: "Build from source", href: `${repoUrl}#building` } : undefined;
    case "open":
      return d.website ? { label: "Open", href: d.website } : undefined;
    case "visit":
      return d.website ? { label: "Visit", href: d.website } : undefined;
    case "docs":
      return { label: "Docs", href: d.docs ?? d.website ?? repoUrl ?? "#" };
    case "install":
      return d.npm ? { label: "npm", href: `https://www.npmjs.com/package/${d.npm}` } : undefined;
    default:
      return undefined;
  }
}

/** Short label for the pill button on cards and rows. */
export function pillLabel(item: CatalogItem) {
  return {
    download: "Get",
    build: "Build",
    open: "Open",
    visit: "Visit",
    docs: "Docs",
    install: "View",
  }[item.data.action ?? "install"];
}

/** Absolute URL of the project's main destination, used by the README and search. */
export function homepage(item: CatalogItem) {
  const d = item.data;
  return d.website ?? d.docs ?? (d.repo ? `https://github.com/${d.repo}` : `/projects/${item.id}/`);
}
