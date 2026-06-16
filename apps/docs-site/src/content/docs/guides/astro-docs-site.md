---
title: Astro docs site
description: Generate a Starlight documentation site from your test results
---

The Astro formatter turns your test output into a full [Starlight](https://starlight.astro.build/) documentation site. Run your tests, point the formatter at the results, and you get a browsable site with sidebar navigation, status badges, Mermaid diagrams, and search. Deploy it anywhere you'd deploy a static site.

## Getting started

Scaffold a new docs site and install dependencies:

```bash
npx executable-stories init-astro my-docs
cd my-docs
pnpm install
```

This creates a ready-to-run Starlight project with the right directory structure and Mermaid support pre-configured. The generated stories go into `src/content/docs/stories/` and Starlight auto-generates the sidebar from whatever lands there.

## Generating docs from test results

### build-docs (recommended)

The `build-docs` subcommand runs the full pipeline in one step. From a single raw run it generates story pages, Explorer data, and bundles referenced media — no flags to get wrong:

```bash
npx executable-stories build-docs raw-run.json --site-dir ./my-docs
```

With an OpenAPI spec it also generates API coverage pages:

```bash
npx executable-stories build-docs raw-run.json \
  --site-dir ./my-docs \
  --openapi ./openapi.yaml
```

Then start the dev server:

```bash
cd my-docs
pnpm dev
```

Your generated story pages are at `http://localhost:4321/stories/` and the Scenario Explorer is at `http://localhost:4321/explorer/`.

#### What build-docs generates

| Output | Location |
|--------|----------|
| Story pages (one per source file) | `src/content/docs/stories/` |
| StoryReport JSON (Explorer data) | `public/stories/story-report.json` |
| Scenario notes index | `public/stories/notes-index.json` |
| Copied screenshots/videos | `public/stories/assets/` |
| API coverage pages (if `--openapi`) | `src/content/docs/api/` |

The bundled **Scenario Explorer** (`/explorer/`) is a single browsable front door over the StoryReport JSON: a scenario list with status, a status filter, and a search box that matches titles, tags, and **`covers` file paths** — so you can type a product-code path and find the behavior that exercises it (the same code→scenario link the MCP `get_scenarios_for_paths` tool uses). Each scenario's detail panel lists its steps, the paths it covers, and a business-context link when a scenario note exists.

For a stakeholder-first portal, generate docs with audience split and a baseline:

```bash
npx executable-stories build-docs raw-run.json \
  --site-dir ./my-docs \
  --audience-split \
  --baseline ./my-docs/public/stories/story-report.json
```

### format --format astro (manual)

If you need finer control over artifact placement, use `format --format astro` directly:

```bash
npx executable-stories format raw-run.json \
  --format astro \
  --output-dir ./my-docs/src/content/docs/stories
```

If your tests produce screenshots or other local assets, add `--asset-mode copy` so the formatter copies them into the site's public directory with content-hashed filenames:

```bash
npx executable-stories format raw-run.json \
  --format astro \
  --output-dir ./my-docs/src/content/docs/stories \
  --asset-mode copy
```

## What gets generated

Each run produces a Markdown file with Starlight-compatible YAML frontmatter:

```yaml
---
title: User Stories
description: 3 scenarios — passed
sidebar:
  badge:
    text: Passed
    variant: success
---
```

The sidebar badge reflects the overall test status:

| Status | Badge | Color |
|--------|-------|-------|
| All passed | Passed | Green |
| Any failed | Failed | Red |
| Any pending | Pending | Yellow |
| All skipped | Skipped | Yellow |

Inside the Markdown, scenarios are grouped by source file and use Gherkin-style formatting (bold Given/When/Then keywords, tags inline, status indicators).

## Combining with other formats

You can generate the Astro site alongside your regular HTML and Markdown reports in a single command:

```bash
npx executable-stories format raw-run.json \
  --format astro,html,markdown
```

The Astro output goes to `--output-dir`, while HTML and Markdown go to `--output-dir` with extensions as usual.

## Asset handling

When `--asset-mode copy` is set, the formatter:

1. Scans the generated Markdown for local image and video references
2. Copies each file to `public/stories/assets/` with a content hash appended to the filename
3. Rewrites the paths in the Markdown to point at the hashed copies

URLs, data URIs, and paths inside fenced code blocks are left alone. If a referenced file is missing, the formatter fails by default. Pass `--allow-missing-assets` to get a warning instead.

## Deploying

The scaffolded site is a standard Astro project. Build it and deploy the `dist/` directory:

```bash
pnpm build
```

Works with Vercel, Netlify, GitHub Pages, Cloudflare Pages, or any static host. See [Astro's deployment guides](https://docs.astro.build/en/guides/deploy/) for platform-specific instructions.

## CLI reference

### init-astro

```bash
npx executable-stories init-astro [directory]
```

| Option | Default | Description |
|--------|---------|-------------|
| `directory` | `story-docs` | Where to create the site |
| `--force` | `false` | Overwrite if directory exists |
| `--update` | `false` | Refresh framework files (components, styles, explorer) without touching your content or config |

### build-docs

```bash
npx executable-stories build-docs <raw-run.json> --site-dir <dir> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--site-dir` | (required) | Root of the `init-astro`-scaffolded site |
| `--openapi` | — | Path to an OpenAPI spec for API coverage pages |
| `--baseline` | — | Previous `story-report.json` to generate a what's-changed view |
| `--audience-split` | `false` | Split generated pages into engineer/stakeholder sections |
| `--no-synthesize-stories` | `false` | Skip synthesizing story metadata from test structure |

### format --format astro

```bash
npx executable-stories format <input> --format astro [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--output-dir` | `reports` | Where to write the `.md` files |
| `--output-name` | `index` | Base filename (without extension) |
| `--asset-mode` | (none) | Set to `copy` to copy local assets |
| `--allow-missing-assets` | `false` | Warn instead of failing on missing assets |
