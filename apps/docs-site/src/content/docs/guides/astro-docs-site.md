---
title: Astro docs site
description: A live Starlight documentation site from your test results, driven by one config
---

The `executable-stories-astro` integration turns your test output into a full
[Starlight](https://starlight.astro.build/) site — generated scenarios and your
hand-authored docs side by side, with sidebar navigation, status badges, Mermaid
diagrams, and search. It is **live**: a content loader watches canonical
per-source reports, so a focused test run hot-reloads the open page without
hiding untouched scenarios. The generated state is disposable; tests stay the
source of truth.

This guide scaffolds a new site. Already have an Astro site? See
[Add to an existing Astro site](/guides/existing-astro-site/). Collating runs
from many repositories? See the
[multi-repo docs hub guide](/guides/multi-repo-docs-hub/).

## Getting started

```bash
npx --package executable-stories-formatters executable-stories init-astro my-docs
cd my-docs && pnpm install
```

This scaffolds a thin, ready-to-run Starlight project. The docs framework itself
ships in the `executable-stories-astro` package, so the scaffold is just ~8
user-owned files — chiefly **one config file** you edit.

Then let the reporter populate `reports/by-file/` (see below), run your tests in
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
  source: '../reports/by-file',               // per-file reports, a single run JSON, or `sources: [...]`
  include: { tags: ['security'] },           // which scenarios to show (optional)
  groupBy: 'tag',                            // feature | tag | source | status | none
  docs: [{ path: 'src/content/docs/runbooks', label: 'Runbooks', base: 'runbooks' }],
  // historyFile: '../reports/history.json', // CLI --history-file store for journey trends
  theme: { preset: 'terminal', tokens: { pass: '#16a34a' } },
});
```

| Field | What it does |
|---|---|
| `source` / `sources` | One per-file directory, an intentional run snapshot, or several named suites (combined in one site, groupable by suite). |
| `include` / `exclude` | Select scenarios by `tags`, `status`, or `features`. |
| `groupBy` | How the index/Explorer categorise scenarios. |
| `docs` | Authored markdown folders to surface in the nav. |
| `views` | Persona views: filtered, re-grouped indexes at their own URLs (e.g. `/for/product`). See [Tagging for your audience](/guides/tagging-for-your-audience/). |
| `journeysBase` / `injectJourneys` | Where the journey walkthroughs mount (default `/journeys`; derived from `journey:<id>:<n>` tags). |
| `statesBase` / `injectStates` | Where the UI-state catalog mounts (default `/states`; derived from `state:<name>` tags, viewport variants side by side). |
| `driftBase` / `injectDrift` | Multi-source status comparison (default `/drift`; injected automatically with at least two sources). |
| `historyFile` | Store maintained by CLI `--history-file`; enables recent-run stability on journey pages. |
| `collection` | Collection name the loader feeds (default `stories`). |
| `routeBase` / `explorerBase` | Where the pages mount (default `/stories`, `/explorer`). |
| `agentEndpoints` | Inject `/llms.txt` and per-story Markdown twins at `<routeBase>/<slug>.md` (default `true`). |
| `theme` | `preset` (`default`/`terminal`/`minimal`/`vibrant`), `accent` shorthand, and per-token `tokens` overrides. Restyles the story content; the Starlight shell keeps its own theme. |

See the full reference in the [`executable-stories-astro` README](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-astro).

## What you get

- **`/stories`** — an index of every scenario, categorised by `groupBy`, each
  linking to a detail page with its Given/When/Then steps and docs. Styled out
  of the box; no CSS to wire.
- **`/explorer`** — a searchable, filterable Scenario Explorer (by text, status,
  and tag). Filters live in the query string (`?tag=capability:checkout`,
  `?q=refund&status=failed`), so a filtered view is a link you can paste into a
  ticket — see [linking in from a ticket](/guides/tagging-for-your-audience/)
  for why that link should carry a tag rather than a scenario's URL.
- **`/journeys`** — ordered multi-scenario walkthroughs derived from
  `journey:<id>:<n>` tags, each rendered as full scenario cards (storyboards
  included) under one aggregate status. Embed one in MDX with
  `<StoryJourney id="..." />`.
- **`/states`** — a thumbnail grid of the states the product verifiably
  has, from `state:<name>` tags; `viewport:*` variants render side by side.
  Non-UI scenarios appear with data-card thumbnails from their `story.state()`
  snapshots.
- **`/drift`** — with two or more sources, compares each scenario's status
  side by side and floats disagreements or missing scenarios first.
- **Auto-built nav** — spread `storiesSidebar(config)` into your Starlight
  `sidebar` and the Stories/Explorer links and your docs groups appear without
  hand-wiring. The nav stays fresh in dev: when a test run adds, renames, or
  removes scenarios, the integration triggers a dev-server restart so the
  sidebar rebuilds (status-only changes hot-reload without a restart).
- **Live trajectory** — the shipped `<Trajectory />` component shows
  "passed N → M since you started" across a watch session.
- **Agent endpoints** — `/llms.txt` indexes every scenario, and each story page
  has a plain-Markdown twin at `/stories/<slug>.md`, so the deployed site is
  consumable by agents and `curl`, not just browsers. Disable with
  `agentEndpoints: false`.
- **Design context** — `story.link()` entries pointing at Figma, Zeplin,
  Sketch, or Abstract (or deliberately labelled `Design ...`) appear on story
  and journey pages. The same link remains in the scenario's normal docs.

If the CLI persists history, reuse that store in the site:

```bash
executable-stories format reports/raw-run.json --format html \
  --history-file reports/history.json
```

```js
export default defineExecutableStories({
  source: '../reports/by-file',
  historyFile: '../reports/history.json',
});
```

Journey history is aggregated by run: any failed member fails the journey run.
The badge uses the same stable/unstable/flaky classification as the HTML report.

## Showing the whole suite, not just the last run

`raw-run.json` holds one test run. Point a site at it and a teammate who ran a
single test file publishes a site missing everything else.

A `source` may name a directory instead. Each test source file owns a report
under `<outputDir>/by-file/` (see
[Output modes](/guides/output-modes/#running-part-of-the-suite)), and the site
reads all of them:

```js
export default defineExecutableStories({
  source: '../reports/by-file', // every test file, however much of the suite last ran
});
```

This is the scaffold default, so `init-astro` sites get it without configuration.

`inputType` needs no setting either way: a directory holds the canonical reports a
test run writes, a single path is a raw run, and the loader reads each as what it
is. Set it explicitly only to override that.

A directory counts as one source, because it is one suite split across files.
`sources: [...]` still combines separate suites, and each entry can be a
directory:

```js
export default defineExecutableStories({
  sources: [
    { name: 'unit', label: 'Unit', source: '../reports/by-file' },
    { name: 'e2e', label: 'End to end', source: '../e2e/reports/by-file' },
  ],
});
```

In dev the watcher picks up changes to files inside the directory, including run
files that did not exist when the server started, so a new test file appears
without a restart.

## Persona views

`views` mounts audience lenses over the same scenarios — `/for/product`,
`/for/design`, `/for/support` — each a filtered, re-grouped index driven by
the tags your tests already carry:

```js
views: [
  { base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' },
  { base: '/for/design',  include: { tags: ['storyboard'] } },
],
```

Each view appears in the sidebar under "Audiences" and renders the same
interactive index as `/stories`, filtered to its audience. The tag vocabulary
and per-persona recipes live in
[Tagging for your audience](/guides/tagging-for-your-audience/).

## Embedding scenarios in your own pages

Authored MDX pages can pull scenarios in as live evidence, rendered from the
same collection as the story pages — so an embed can never drift from the
latest run:

```mdx
import StoryScenario from 'executable-stories-astro/components/StoryScenario.astro';
import StoryStatus from 'executable-stories-astro/components/StoryStatus.astro';

We cap discounts at 30% — enforced end-to-end
(currently <StoryStatus id="checkout--caps-the-discount-at-30-percent" />):

<StoryScenario id="checkout--caps-the-discount-at-30-percent" />
```

`<StoryScenario/>` renders the full scenario card (steps, status, failure
output, attached docs); `<StoryStatus/>` is an inline linked status pill. Both
accept the stable scenario id (copy it from the Explorer), the URL slug, or the
exact title, and render a visible callout when the id no longer matches — an
embed never silently disappears. This pairs with `<VerifiedBy/>` (frontmatter
`verifiedBy:` refs → a live pass/fail badge) for page-level verification.

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

## Emitting per-source report state

The reporter maintains canonical files under `reports/by-file/`; that directory is the
recommended loader source. Keep `rawRunPath` when current-run CLI commands also need the
execution event:

```js
new StoryReporter({ formats: ['html'], rawRunPath: 'reports/raw-run.json' })
```

Point the config's `source` at `../reports/by-file`.

## Deploying

The scaffolded site is a standard Astro project — build it and deploy `dist/`:

```bash
pnpm build
```

Run your full suite in CI before `astro build` so the per-source state and
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
> integration, which renders stories from canonical run state with no Markdown generation step.
> Scaffold with `init-astro` and run `astro dev`. (`format --format astro-markdown`
> still exists for a one-off single-page Markdown export.)
