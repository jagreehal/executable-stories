---
"executable-stories-formatters": major
---

Make Astro a first-class way to view living docs.

- **New package `executable-stories-astro`**: an Astro integration + Content Layer
  loader that turns the test run JSON into a hot-reloading `stories` collection,
  with injected routes for a stories index (`/stories`), per-scenario detail
  pages (`/stories/<slug>`), and a searchable Scenario Explorer (`/explorer`).
- **BREAKING — `serve` removed**: the `serve` subcommand (a custom HTTP server)
  is removed in favour of the Astro dev server. Running `executable-stories serve`
  now prints a migration message. Scaffold with `init-astro`, run your tests in
  watch mode, and run `astro dev` to hot-reload the docs.
- **BREAKING — `build-docs` removed**: the `build-docs` subcommand (a one-shot
  Markdown generator that wrote story pages into a scaffold) is removed — stories
  now render live from the run JSON via the `executable-stories-astro`
  integration, with no Markdown-generation step. `executable-stories build-docs`
  now prints the same migration message as `serve`. (`format --format
  astro-markdown` still exists for one-off single-page exports.)
- **`init-astro` reworked** to a thin scaffold (~8 user-owned files); the docs
  framework now ships inside `executable-stories-astro`. The scaffold is driven
  by a single `executable-stories.config.mjs` (sources, scenario selection,
  `groupBy` categorisation, authored docs, theme) imported by both
  `astro.config.mjs` and `src/content.config.ts`, with `storiesSidebar()`
  building the nav and `authoredDocsLoader` auto-titling plain markdown.

**Migrating from the old `init-astro` scaffold** (the previous version copied
~30 framework files into your repo; they now ship in the package):

1. Delete these directories if you did not customise them:
   `src/components`, `src/lib`, `src/pages/explorer`, `src/styles/themes`.
   (Keep anything of your own you added under them.)
2. Add the dependency: `executable-stories-astro`.
3. In `astro.config.mjs`: `import { executableStories } from "executable-stories-astro"`
   and add `executableStories({ source: "../reports/raw-run.json" })` to
   `integrations` (before `starlight()`).
4. In `src/content.config.ts`: `import { storiesLoader } from "executable-stories-astro/loader"`
   and add `stories: defineCollection({ loader: storiesLoader({ source: "../reports/raw-run.json" }) })`.
5. Remove any `build-docs` step that wrote story Markdown into `src/content/docs` —
   stories now render live at `/stories`.
