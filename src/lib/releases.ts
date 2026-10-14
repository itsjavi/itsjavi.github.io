import { mkdir, readFile, writeFile } from "node:fs/promises";

export interface Release {
  version: string;
  date: Date;
  url: string;
  source: "github" | "npm" | "tag";
  /** Sanitized HTML rendered by GitHub, from the release or the repo's CHANGELOG.md. */
  notesHtml?: string;
  /** First line of the release notes that reads like a summary. */
  summary?: string;
}

interface CachedRelease extends Omit<Release, "date"> {
  date: string;
}

const CACHE_FILE = "node_modules/.cache/itsjavi/releases.json";
const CACHE_TTL_MS = 60 * 60 * 1000;
const inflight = new Map<string, Promise<Release | null>>();
let diskCache: Promise<Record<string, { at: number; release: CachedRelease | null }>> | undefined;

// Lines that open most release notes but don't describe the release.
const BOILERPLATE =
  /^(signed with|check a download|requires macos|\*\*full changelog|full changelog|#)/i;

function summarize(body: string | undefined): string | undefined {
  const line = body
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("-") && !l.startsWith("*") && !BOILERPLATE.test(l));
  if (!line || line.length > 160) return undefined;
  // "QuickEdit 0.3.0: more languages, …" → "More languages, …"
  const text = line.replace(/^[^:]{1,40}\d+\.\d+[^:]*:\s*/, "").replace(/[`*_]/g, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Drops paragraphs that only carry signing and checksum boilerplate. */
function cleanNotes(html: string | undefined) {
  const cleaned = html
    ?.replace(/<p>[\s\S]*?<\/p>/g, (p) =>
      BOILERPLATE.test(p.replace(/<[^>]+>/g, "").trim()) ? "" : p,
    )
    .trim();
  return cleaned || undefined;
}

async function request(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  return (await request(url, { headers }))?.json();
}

function githubHeaders(accept = "application/vnd.github+json") {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fromGitHub(repo: string): Promise<Release | null> {
  const data = await fetchJson(
    `https://api.github.com/repos/${repo}/releases/latest`,
    githubHeaders("application/vnd.github.full+json"),
  );
  if (!data) return null;
  return {
    version: String(data.tag_name).replace(/^v/, ""),
    date: new Date(data.published_at),
    url: data.html_url,
    source: "github",
    notesHtml: cleanNotes(data.body_html),
    summary: summarize(data.body),
  };
}

async function fromNpm(pkg: string): Promise<Release | null> {
  const data = await fetchJson(`https://registry.npmjs.org/${pkg.replace("/", "%2F")}`);
  const version = data?.["dist-tags"]?.latest;
  if (!version) return null;
  return {
    version,
    date: new Date(data.time[version]),
    url: `https://www.npmjs.com/package/${pkg}`,
    source: "npm",
  };
}

/** Latest git tag, for repos that tag versions without publishing GitHub releases. */
async function fromTag(repo: string): Promise<Release | null> {
  const [tag] =
    (await fetchJson(`https://api.github.com/repos/${repo}/tags?per_page=1`, githubHeaders())) ??
    [];
  if (!tag) return null;
  const commit = await fetchJson(tag.commit.url, githubHeaders());
  return {
    version: String(tag.name).replace(/^v/, ""),
    date: new Date(commit?.commit?.committer?.date ?? Date.now()),
    url: `https://github.com/${repo}/tags`,
    source: "tag",
  };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The section of a Keep a Changelog-style file for one version, without its heading. */
export function changelogSection(markdown: string, version: string) {
  const heading = new RegExp(`^(#{1,3})\\s+\\[?v?${escapeRegExp(version)}\\]?(\\s|$)`, "m");
  const match = heading.exec(markdown);
  if (!match) return undefined;
  const rest = markdown.slice(match.index).replace(/^[^\n]*\n?/, "");
  const next = new RegExp(`^#{1,${match[1].length}}\\s`, "m").exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim() || undefined;
}

/** Release notes from CHANGELOG.md, rendered and sanitized by GitHub's Markdown API. */
async function changelogNotes(repo: string, version: string) {
  const file = await request(`https://raw.githubusercontent.com/${repo}/HEAD/CHANGELOG.md`);
  const section = file && changelogSection(await file.text(), version);
  if (!section) return undefined;
  const html = await request("https://api.github.com/markdown", {
    method: "POST",
    headers: { ...githubHeaders("text/html"), "Content-Type": "application/json" },
    body: JSON.stringify({ text: section, mode: "gfm", context: repo }),
  });
  return html?.text();
}

async function readDiskCache() {
  diskCache ??= readFile(CACHE_FILE, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => ({}));
  return diskCache;
}

let writes = Promise.resolve();

function writeDiskCache(key: string, release: Release | null) {
  // Serialized so concurrent lookups never interleave writes to the same file.
  writes = writes.then(async () => {
    const cache = await readDiskCache();
    cache[key] = {
      at: Date.now(),
      release: release && { ...release, date: release.date.toISOString() },
    };
    await mkdir("node_modules/.cache/itsjavi", { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache));
  });
  return writes;
}

/**
 * Latest release of a project: GitHub Releases, then npm, then the latest git tag. Notes come from the
 * release, or from CHANGELOG.md when the release has none. Returns null when there is no version
 * or the network fails, so the site still builds offline.
 */
export function getLatestRelease(repo?: string, npm?: string): Promise<Release | null> {
  const key = `${repo ?? ""}|${npm ?? ""}`;
  if (!repo && !npm) return Promise.resolve(null);
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const cached = (await readDiskCache())[key];
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.release && { ...cached.release, date: new Date(cached.release.date) };
      }
      try {
        const release =
          (repo ? await fromGitHub(repo) : null) ??
          (npm ? await fromNpm(npm) : null) ??
          (repo ? await fromTag(repo) : null);
        if (release && !release.notesHtml && repo) {
          release.notesHtml = await changelogNotes(repo, release.version).catch(() => undefined);
        }
        await writeDiskCache(key, release);
        return release;
      } catch (error) {
        console.warn(`[releases] ${key}: ${(error as Error).message}`);
        return cached?.release ? { ...cached.release, date: new Date(cached.release.date) } : null;
      }
    })();
    inflight.set(key, pending);
  }
  return pending;
}
