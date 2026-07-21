---
title: Add stories to an existing Astro site
description: Wire executable-stories-astro into the Astro site you already have, no scaffold required
---

You do not need a separate docs site to publish living documentation. The
`executable-stories-astro` integration drops into any Astro project, with or
without Starlight. Install one package, register the integration, point it at
your run JSON. Your existing pages are untouched; the integration injects
`/stories` and `/explorer` alongside them.

If you are starting from zero, the [scaffold](/guides/astro-docs-site/) is
quicker. This guide is for teams that already have an Astro site (product docs,
a marketing site, an internal portal) and want scenarios published into it.

## 1. Install

```bash
pnpm add executable-stories-astro @astrojs/react
```

The story pages render the same React report components as the standalone HTML
report, so the React renderer must be registered. If your site already uses
`@astrojs/react`, skip that half.

## 2. Create the config

One config object drives everything. Put it next to `astro.config.mjs`:

```js
// executable-stories.config.mjs
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  source: 'reports/raw-run.json',
});
```

## 3. Register the integration

```js
// astro.config.mjs
import react from '@astrojs/react';
import { executableStories } from 'executable-stories-astro';
import esConfig from './executable-stories.config.mjs';

export default defineConfig({
  integrations: [
    react(),                      // must come before executableStories
    executableStories(esConfig),  // injects /stories, /stories/<slug>, /explorer
    // ...your existing integrations
  ],
});
```

## 4. Register the collection

Add the stories collection to your existing `src/content.config.ts` (create the
file if your site has no collections yet). Keep whatever collections you
already define:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { storiesLoader } from 'executable-stories-astro';
import esConfig from '../executable-stories.config.mjs';

export const collections = {
  // ...your existing collections stay as they are
  stories: defineCollection({ loader: storiesLoader(esConfig) }),
};
```

## 5. Emit the run JSON

The loader reads the raw run JSON your reporter writes when `rawRunPath` is
set:

```js
new StoryReporter({ formats: ['html'], rawRunPath: 'reports/raw-run.json' })
```

That's it. Run your tests, start `astro dev`, and open `/stories`. The loader
watches the file, so a fresh test run hot-reloads the open page.

## Starlight or not

The injected pages adapt to the host site via the `shell` option:

- **`'auto'` (default)** uses the Starlight shell (sidebar, search, theme
  toggle) when `@astrojs/starlight` is installed, and standalone styled pages
  otherwise.
- **`'standalone'`** forces the self-contained pages even inside a Starlight
  site.
- **`'starlight'`** forces the Starlight shell.

On a Starlight site, spread `storiesSidebar(esConfig)` into your `sidebar`
array to get the Stories and Explorer nav entries without hand-wiring.

## Embedding scenarios in your existing pages

The injected routes are optional. You can set `injectStoryRoute: false` and
instead pull scenarios into the MDX pages you already have, as live evidence
that can never drift from the latest run:

```mdx
import StoryScenario from 'executable-stories-astro/components/StoryScenario.astro';
import StoryStatus from 'executable-stories-astro/components/StoryStatus.astro';

Discounts are capped at 30%, enforced end-to-end
(currently <StoryStatus id="checkout--caps-the-discount-at-30-percent" />):

<StoryScenario id="checkout--caps-the-discount-at-30-percent" />
```

## Gotchas

- **Mermaid**: story pages render Mermaid via a small inline loader on
  `pre[data-mermaid]`. If your site uses `astro-mermaid`, both would process
  the same elements; keep story sources and site sources distinct, or drop one.
- **Route collisions**: if your site already owns `/stories` or `/explorer`,
  move the injected routes with `routeBase` and `explorerBase`.
- **Monorepos**: `source` resolves relative to the Astro project root, so a
  site in `apps/docs` reads a sibling app's output with
  `source: '../web/reports/raw-run.json'`.

## Several suites, one site

`sources` combines multiple run JSONs, each shown as a named suite:

```js
sources: [
  { name: 'web', label: 'Web app', source: '../apps/web/reports/raw-run.json' },
  { name: 'api', label: 'API',     source: '../apps/api/reports/raw-run.json' },
],
groupBy: 'source',
```

To combine runs from *different repositories*, see the
[multi-repo docs hub guide](/guides/multi-repo-docs-hub/).

## Full reference

The [Astro docs site guide](/guides/astro-docs-site/) covers the whole config
(selection, grouping, authored docs, theming, agent endpoints), and the
[`executable-stories-astro` README](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-astro)
has the complete field table.
