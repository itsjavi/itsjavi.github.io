# itsjavi.com modern Astro site

This repository is the fresh Astro implementation of `itsjavi.com`. It produces a static site for the
existing GitHub Pages deployment. The migration deliberately uses current framework APIs rather than
compatibility adapters from the legacy application.

## Requirements

- Node.js 24.16 or newer on the Node 24 line, or Node.js 26.3 or newer on the Node 26 line. Astro supports
  even-numbered Node.js releases, and `eslint-plugin-astro` sets the higher patch-level requirement.
- pnpm 12.4.2, pinned by the `packageManager` field.

CI and the migration verification use Node.js 26.8.1 and pnpm 12.4.2.

Runtime and development dependencies use caret (`^`) ranges; the lockfile records the exact installed
versions for reproducible builds. TypeScript uses `^6.0.3` because the current `@astrojs/check` peer range
supports TypeScript 5 and 6. The previous TypeScript 7 declaration was not compatible with Astro's
current check integration.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
pnpm preview
pnpm format
pnpm format:check
pnpm lint
```

`pnpm lint` runs three checks in sequence and propagates failures: Oxlint over supported JavaScript and
TypeScript-family source, the community-maintained `eslint-plugin-astro` over `.astro` templates only, and
`astro check` for Astro diagnostics and TypeScript checking. Oxlint does not inspect Astro template markup.

`pnpm format` uses Oxfmt for its supported files, including JavaScript, TypeScript, JSON, CSS, Markdown and
MDX. `.astro` files are excluded from Oxfmt and formatted only by Prettier with Astro's official
`prettier-plugin-astro`. `pnpm format:check` checks the same ownership without changing files. Generated
`.astro/` and `dist/` output and installed dependencies are ignored.

VS Code uses the Oxc extension as the default formatter and Prettier only for Astro files. The Astro,
ESLint, Prettier, Oxc and MDX extensions are recommended in the workspace settings.

## Stack

- Astro 7.3.3 with the official MDX 8.0.1, sitemap 3.7.4 and RSS 4.0.19 packages
- Tailwind CSS and `@tailwindcss/vite` 4.3.3
- daisyUI 5.7.42 and Tailwind Typography 0.5.20, configured as CSS plugins
- Oxfmt 0.68.0 and Oxlint 1.83.0

The site remains statically rendered. `astro.config.mjs` uses Tailwind's Vite plugin directly; it does not use
the deprecated Astro Tailwind integration or a server adapter.

## Content and browser behavior

`src/content.config.ts` defines build-time `glob()` collections. Blog entry filenames are the canonical
public IDs; project filenames also match their existing public IDs, including `new-css-logo`. Pages,
cards and RSS all use those IDs. Render content with Astro's `render()` function. `src/data/experiments.json`
holds experiment data, and `src/config.ts` controls site metadata and the intentionally hidden blog UI.

The shared layout uses Astro's `ClientRouter`. The mobile navigation uses a native modal dialog.
Editor links use document navigation. CodeMirror and CodePen initialize through custom elements;
Giscus initializes after `astro:page-load`, when Astro has finished replaying scripts. Saved editor documents retain the `editor_code` localStorage
schema (`title`, `html`, `css`, `js`); the preview runs in an opaque sandbox iframe.

The `site` daisyUI theme is authored in `src/styles/global.css` using current CSS theme tokens. Content,
media, public URLs and the original attribution are preserved. Small differences in current daisyUI
control dimensions, syntax highlighting and focus styling are expected.

## Release and rollback

Run the install, format check, lint and build commands above from this repository. `pnpm preview --host
127.0.0.1 --port 4323` serves the production `dist/` artifact locally. Check the home, project/blog
listings and details, tag pages, experiments, CV, 404, editor and fullscreen editor at desktop and mobile
widths. Verify `rss.xml`, `sitemap-index.xml`, `sitemap-0.xml`, `robots.txt` and `CNAME` in `dist/`.

The workflow preserves the original single-job GitHub Pages deployment: pushes to `main` and manual
runs install with `--frozen-lockfile`, build, upload `dist/` and deploy directly. No pull request is
required. The only workflow change from the original is Node.js 26.8.1 for compatibility with the new
stack. Run `pnpm format:check` and `pnpm lint` locally before publishing.

`public/CNAME` is copied into the artifact for `itsjavi.com`; no base path or server adapter is needed.
The site builds independently of the sibling legacy checkout. Publishing requires pushing this
repository to `main` or running the workflow; the migration did not publish a release or change the
Pages/domain settings.

Migration evidence and acceptance records live in the parent workspace's Backlog milestone `m-0`,
tasks `TASK-1` through `TASK-5`, and `backlog/assets/`. The rollback reference is the unchanged
`astro4-legacy` repository at `965ea7ffe8b1ebfbc70c81ce598629e502d7280d`; retain its known-good deployment
artifact until the modern release has been checked in production. Roll back by redeploying that
known-good artifact through the existing Pages process.

Browser verification intercepts CodePen exports, stubs embed services when checking lifecycle behavior,
and blocks analytics. Live service availability, authenticated Giscus posting, published pens, real
analytics ingestion and GitHub-hosted CI/deployment require a separate live check. Local and preview
hosts never load analytics; the production hostname initializes the existing tracker once per document.

The current Astro/MDX build emits a Rolldown warning about its generated `use astro:head-inject`
directive, plus a size warning for the CodeMirror editor bundle. Both remain visible; the build succeeds
and the production content/editor checks pass. CodeMirror is loaded on editor pages only.
