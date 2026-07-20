# executable-stories-astro

Make Astro a first-class way to view living documentation. An Astro integration +
content loaders that turn your test run JSON into a **hot-reloading** docs site —
generated scenarios and your hand-authored docs, side by side, driven by **one
config object**.

```bash
npx --package executable-stories-formatters executable-stories init-astro my-docs   # scaffold (recommended)
```

## One config drives everything

Author the config once and hand the **same object** to both halves of the
integration. This is the single source of truth for sources, scenario selection,
categorisation, authored docs, navigation, and theme.

```js
// executable-stories.config.mjs
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  // ── Sources: what test output to include ──────────────────────────
  source: '../reports/raw-run.json',        // single suite (shorthand)
  // sources: [                              // …or several, grouped by suite
  //   { name: 'web', label: 'Web app', source: '../apps/web/reports/raw-run.json' },
  //   { name: 'api', label: 'API',     source: '../apps/api/reports/raw-run.json' },
  // ],

  // ── Selection: which scenarios to show ────────────────────────────
  include: { tags: ['security'] },          // allowlist (tags | status | features)
  exclude: { status: ['skipped'] },         // denylist, applied after include

  // ── Categorisation ────────────────────────────────────────────────
  groupBy: 'tag',                           // 'feature' | 'tag' | 'source' | 'status' | 'none'

  // ── Authored docs: bring existing markdown in ─────────────────────
  docs: [{ path: 'src/content/docs/runbooks', label: 'Runbooks', base: 'runbooks' }],

  // ── Routes & theme ────────────────────────────────────────────────
  routeBase: '/stories',                    // default
  explorerBase: '/explorer',                // default
  theme: { accent: '#0b7285' },
});
```

```js
// astro.config.mjs
import { executableStories, storiesSidebar } from 'executable-stories-astro';
import esConfig from './executable-stories.config.mjs';

export default defineConfig({
  integrations: [
    executableStories(esConfig),            // injects /stories, /stories/<slug>, /explorer
    starlight({
      sidebar: [{ label: 'Home', slug: 'index' }, ...storiesSidebar(esConfig)],
    }),
  ],
});
```

```ts
// src/content.config.ts
import { storiesLoader, trajectoryLoader, authoredDocsLoader } from 'executable-stories-astro';
import esConfig from '../executable-stories.config.mjs';

export const collections = {
  docs: defineCollection({ loader: authoredDocsLoader({ path: 'src/content/docs' }), schema: docsSchema() }),
  stories: defineCollection({ loader: storiesLoader(esConfig) }),
  trajectory: defineCollection({ loader: trajectoryLoader(esConfig) }),
};
```

## Config reference

| Field | Type | Default | What it does |
|---|---|---|---|
| `source` | `string` | — | One run JSON (shorthand for `sources: [{ source }]`). |
| `sources` | `StorySource[]` | — | Several named suites. `{ name?, label?, source, inputType?, synthesize? }`. Names are derived from the path when omitted. |
| `include` | `StoryFilter` | — | Allowlist: `{ tags?, status?, features? }`. A scenario must match. |
| `exclude` | `StoryFilter` | — | Denylist, applied after `include`. |
| `groupBy` | `GroupBy` | `'feature'` | How the index/explorer categorise scenarios: `feature`, `tag` (a scenario appears under each tag), `source` (suite), `status`, or `none`. |
| `docs` | `AuthoredDocsSource[]` | — | Authored markdown folders to surface in the nav: `{ path, label?, base? }`. |
| `collection` | `string` | `'stories'` | Collection name the loader feeds. |
| `routeBase` | `string` | `'/stories'` | Where the stories index + detail pages mount. |
| `explorerBase` | `string` | `'/explorer'` | Where the searchable Scenario Explorer mounts. |
| `injectStoryRoute` | `boolean` | `true` | Inject the stories index + detail routes. |
| `injectExplorer` | `boolean` | `true` | Inject the Scenario Explorer. |
| `agentEndpoints` | `boolean` | `true` | Inject `/llms.txt` + a Markdown twin per story at `<routeBase>/<slug>.md`. |
| `theme.accent` | `string` | — | Accent colour for the standalone story pages. |

## What you get

- **Injected routes** — a stories index at `routeBase`, one detail page per
  scenario, and a searchable/filterable Explorer. All styled out of the box (you
  do not wire any CSS) and link-correct for any `routeBase`.
- **Hot reload** — the loader watches the run JSON; a fresh test run updates the
  open page with no reload. Nothing is written to disk; tests stay the source of
  truth. When a run changes the *nav tree* (scenario added/renamed/removed) the
  integration triggers a dev-server restart so the Starlight sidebar rebuilds
  too; status-only changes stay pure HMR.
- **`storiesSidebar(config)`** — builds Starlight sidebar entries from the config
  (Stories, Explorer, and a group per `docs` source) so you don't hand-wire nav.
- **Agent endpoints** — `/llms.txt` (an [llms.txt](https://llmstxt.org)-format
  index of every scenario) and a plain-Markdown twin of each story page at
  `<routeBase>/<slug>.md`, prerendered as real files on static builds — so the
  deployed site is consumable by agents and `curl`, not just browsers.
- **Self-tuning Vite config** — the integration pre-bundles React + the report
  components (`optimizeDeps`) and dedupes React itself; no `vite` block needed
  in your `astro.config.mjs`.

## Embedding scenarios in authored pages

Hand-written MDX can pull scenarios in as live evidence, rendered from the same
collection as the story pages:

```mdx
import StoryScenario from 'executable-stories-astro/components/StoryScenario.astro';
import StoryStatus from 'executable-stories-astro/components/StoryStatus.astro';

We cap discounts at 30% — enforced end-to-end
(currently <StoryStatus id="checkout--caps-the-discount-at-30-percent" />):

<StoryScenario id="checkout--caps-the-discount-at-30-percent" />
```

`<StoryScenario/>` renders the full scenario card (steps, status, failure
output, attached docs); `<StoryStatus/>` is an inline linked status pill. Both
resolve `id` against the stable scenario id, the URL slug, or the exact title,
and render a visible callout when the reference no longer matches, so embedded
evidence never silently disappears. Pair with `<VerifiedBy/>` for page-level
`verifiedBy:` frontmatter badges.

Both take the same optional props:

| Prop | Type | Default | What it does |
|---|---|---|---|
| `id` | `string` | — | The scenario to resolve (stable id, slug, or exact title). Required. |
| `collection` | `string` | configured `collection` | Resolve against a different loader collection. |
| `title` | `boolean` | `true` (`StoryScenario`) / `false` (`StoryStatus`) | Show the scenario title (the card's title row / the label beside the status pill). |
| `link` | `boolean` | `true` | `StoryScenario` only: show the "View full scenario" link under the card. |

## Authored docs

`authoredDocsLoader({ path })` is a drop-in for Starlight's `docsLoader()` that
makes existing, GitHub-style docs work without edits:

- **Auto-title** — fills a missing `title` from each file's first `# H1` (the one
  field Starlight requires), so frontmatter-free markdown imports cleanly.
- **Cross-link rewriting** — rewrites relative `./other.md` links to their routes,
  so doc-to-doc links don't 404.
- **External folders** — point `path` at a folder outside the site and set `base`
  to mount it under a URL prefix.

The cross-link rewriting happens **inside the loader** (it rewrites the markdown
body before rendering), so it is independent of the markdown processor. This
matters on Astro 7: the default processor is now **Sätteri** (Rust), which does
not run remark plugins — `markdown.remarkPlugins` only applies if you install
`@astrojs/markdown-remark` and opt into the `unified()` processor. `mdLinkRewrite()`
is also exported as a standalone remark plugin for that unified pipeline, but with
`authoredDocsLoader` you don't need it.

## Emitting the run JSON

The loader reads the **raw run JSON**, which your reporter writes only when you
set `rawRunPath`:

```js
new StoryReporter({ formats: ['html'], rawRunPath: 'reports/raw-run.json' })
```

Then run your tests in watch mode in one terminal and `astro dev` in another.
