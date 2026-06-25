---
title: Astro docs site
description: A live Starlight documentation site from your test results, driven by one config
---

The `executable-stories-astro` integration turns your test output into a full
[Starlight](https://starlight.astro.build/) site — generated scenarios and your
hand-authored docs side by side, with sidebar navigation, status badges, Mermaid
diagrams, and search. It is **live**: a content loader watches your run JSON, so
a fresh test run hot-reloads the open page. Nothing is written to disk — your
tests stay the source of truth.

## Getting started

```bash
npx --package executable-stories-formatters executable-stories init-astro my-docs
cd my-docs && pnpm install
```

This scaffolds a thin, ready-to-run Starlight project. The docs framework itself
ships in the `executable-stories-astro` package, so the scaffold is just ~8
user-owned files — chiefly **one config file** you edit.

Then emit the run JSON your reporter must write (see below), run your tests in
watch mode in one terminal, and `astro dev` in another:

```bash
pnpm dev   # http://localhost:4321 — /stories, /explorer, and your docs
```

Editing a test re-runs it and the Stories pages update with no reload.

## One config drives everything

Everything lives in `executable-stories.config.mjs`, imported by both
`astro.config.mjs` and `src/content.config.ts`:

```js
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  source: '../reports/raw-run.json',         // or `sources: [...]` for several suites
  include: { tags: ['security'] },           // which scenarios to show (optional)
  groupBy: 'tag',                            // feature | tag | source | status | none
  docs: [{ path: 'src/content/docs/runbooks', label: 'Runbooks', base: 'runbooks' }],
  theme: { preset: 'terminal', tokens: { pass: '#16a34a' } },
});
```

| Field | What it does |
|---|---|
| `source` / `sources` | One run JSON, or several named suites (combined in one site, groupable by suite). |
| `include` / `exclude` | Select scenarios by `tags`, `status`, or `features`. |
| `groupBy` | How the index/Explorer categorise scenarios. |
| `docs` | Authored markdown folders to surface in the nav. |
| `collection` | Collection name the loader feeds (default `stories`). |
| `routeBase` / `explorerBase` | Where the pages mount (default `/stories`, `/explorer`). |
| `theme` | `preset` (`default`/`terminal`/`minimal`/`vibrant`), `accent` shorthand, and per-token `tokens` overrides. Restyles the story content; the Starlight shell keeps its own theme. |

See the full reference in the [`executable-stories-astro` README](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-astro).

## What you get

- **`/stories`** — an index of every scenario, categorised by `groupBy`, each
  linking to a detail page with its Given/When/Then steps and docs. Styled out
  of the box; no CSS to wire.
- **`/explorer`** — a searchable, filterable Scenario Explorer (by text, status,
  and tag).
- **Auto-built nav** — spread `storiesSidebar(config)` into your Starlight
  `sidebar` and the Stories/Explorer links and your docs groups appear without
  hand-wiring.
- **Live trajectory** — the shipped `<Trajectory />` component shows
  "passed N → M since you started" across a watch session.

## Bringing in existing docs

Hand-authored docs live under `src/content/docs`. The scaffold loads them with
`authoredDocsLoader`, a drop-in for Starlight's `docsLoader()` that makes plain,
GitHub-style markdown work without edits:

- **Auto-title** from each file's first `# H1` (so frontmatter-free files import
  cleanly — the one field Starlight requires).
- **Cross-link rewriting** so relative `./other.md` links resolve to routes
  instead of 404ing.

Point a `docs` source's `path` at a folder outside the site and set `base` to
mount an external docs folder (e.g. another package's `docs/`) under a URL prefix.

## Emitting the run JSON

The loader reads the **raw run JSON**, which your reporter writes only when you
set `rawRunPath`:

```js
new StoryReporter({ formats: ['html'], rawRunPath: 'reports/raw-run.json' })
```

Point the config's `source` at that path.

## Deploying

The scaffolded site is a standard Astro project — build it and deploy `dist/`:

```bash
pnpm build
```

Run your tests and regenerate the run JSON in CI before `astro build` so the
deployed site reflects the latest results. Works with Vercel, Netlify, GitHub
Pages, Cloudflare Pages, or any static host.

## CLI reference

### init-astro

```bash
npx --package executable-stories-formatters executable-stories init-astro [directory]
```

| Option | Default | Description |
|--------|---------|-------------|
| `directory` | `story-docs` | Where to create the site |
| `--force` | `false` | Overwrite if the directory exists |
| `--update` | `false` | Merge any new template deps (the framework updates via `pnpm update executable-stories-astro`) |

> **Migrating from `build-docs`?** It generated Markdown into
> `src/content/docs/stories/` and has been removed in favour of the live
> integration, which renders stories from the run JSON with no generation step.
> Scaffold with `init-astro` and run `astro dev`. (`format --format astro-markdown`
> still exists for a one-off single-page Markdown export.)
