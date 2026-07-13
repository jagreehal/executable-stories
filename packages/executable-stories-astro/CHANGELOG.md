# executable-stories-astro

## 3.0.0

### Minor Changes

- af026d1: Explainer contract v1 + typography-grade markdown rendering.

  Explainers (output of the new `explain-change` skill) are markdown docs whose
  frontmatter carries a machine-readable provenance block citing scenarios by id,
  title, and content hash (hash is mandatory in v1 — id-only citations cannot
  detect drift and are rejected as invalid).
  - **core** (private, bundled into the packages above — no version bump of its
    own): new `executable-stories-core/explainer` module — `scenarioContentHash`
    (title + steps digest, status excluded), `checkExplainerRef` (fresh/changed/
    renamed/missing per citation), `explainerRefFromFrontmatter`.
  - **formatters**: new `check-explainers` subcommand audits a directory of
    explainers against a run (exit 5 when stale/invalid, `--no-fail` to report
    only); `explainer-v1.json` schema; scenario-index items now carry `hash` so
    agents can stamp frontmatter without inventing values.
  - **astro**: `authoredDocsLoader({ explainers: config })` injects a fresh/stale
    banner with story-page deep links into any doc carrying an `explainer` block;
    the init-astro template enables this by default.
  - **Astro-first onboarding**: `init-astro --install` scaffolds AND installs in
    one command (package manager detected from your lockfile), and `format`
    prints a one-line stderr tip pointing at `init-astro` on first contact with
    an output directory (when it writes the artifacts README) if no docs site
    exists yet — never on later runs, and never for `--json-summary` agent
    pipelines.
  - **DX**: the Vitest bootstrap template now uses the `createStoryReporter()`
    factory (no `createRequire`, no `as unknown as Reporter` cast) and the
    Playwright template uses the plain reporter module id; new
    `executable-stories dev` runs the docs site in one command
    (finds `./story-docs`, installs deps if missing, hands off to the dev
    server); `format` drops a write-once README into the output dir explaining
    each artifact; the CLI no longer misreads a docs-site
    `executable-stories.config.mjs` as plugin config.
  - **Rename**: the scenario-index artifact now matches its format and schema
    name — files are `*.scenario-index.json` (was `*.scenarios-index.json`) and
    the MCP HTTP route is `/scenario-index` (was `/scenarios-index`). Update any
    pipeline that globs the old name.
  - **react**: `story.section` markdown now renders through
    `@tailwindcss/typography` (`prose prose-sm`), with the prose palette mapped to
    the report theme tokens so it follows light/dark automatically.

### Patch Changes

- Updated dependencies [af026d1]
  - executable-stories-react@0.4.0

## 2.0.0

### Patch Changes

- fe8cd62: **Self-contained packaging (publish fix).** `executable-stories-core` is now an
  internal, unpublished workspace package: every package that used it now bundles
  its code into their own dist (via tsup `noExternal`) and lists it under
  `devDependencies` instead of `dependencies`. Published packages no longer carry
  a runtime dependency on `executable-stories-core`, so `npm install` resolves
  without it. This releases fixed versions of `executable-stories-formatters`,
  `executable-stories-react`, `executable-stories-mcp`, `executable-stories-astro`,
  and `executable-stories-cypress` (and, via their internal ranges,
  `executable-stories-vitest`, `executable-stories-jest`, and
  `executable-stories-playwright`). No API or behavior change.

  Living-docs trust and change-awareness features: freshness and provenance
  chrome, a per-scenario run timeline, flakiness badges, a "Since last run"
  header strip, a behavior changelog for `compare`, and planned scenarios from
  bodyless `it.todo`.
  - **Freshness + provenance chrome (HTML report)**: the interactive report
    header shows a quiet "Verified N ago" line, escalating to a stale-warning
    banner past `--html-stale-after-days` (default 7; `0` disables). Report
    metadata now links branch, PR, and commit when CI detection resolves them,
    and the converters share the comprehensive `detectCI` (GitHub Actions,
    GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis).
  - **Per-scenario run timeline**: with `--history-file <path>` (updated before
    report generation, so the current run is the latest entry), each scenario
    card renders a dot per recent run with a tooltip summary like "8/10 runs
    passed · Passing for the last 5 runs". `--max-history-runs <n>` (default 10)
    caps retention. History is presentation-layer only — the StoryReport v1
    contract is unchanged.
  - **Flaky badge (executable-stories-react)**: scenarios whose recent runs flip
    between pass and fail get a **Flaky** badge next to the timeline, judged
    over the same window the dots show (same status-transition thresholds as
    the CLI history module).
  - **"Since last run" strip (executable-stories-react)**: one line in the
    report header summarizing newly failing (deep-linked), fixed, and
    first-seen scenarios against the previous run in the history. A quiet run
    states "no behavior changes"; the first run with history renders nothing.
  - **Behavior changelog (executable-stories-formatters)**: new
    `compare --format changelog` writes a release-notes-style changelog
    (`<output-name>.changelog.md`) between two runs — New behavior (each new
    scenario listed with its Given/When/Then steps so the entry reads as a
    specification), Fixed, Broken, Removed, Renamed or moved (rename/move-
    resilient identity, so refactors don't show as removed + added), and
    Changed. Headers carry each run's `packageVersion`, short commit SHA, and
    date. `RunDiffChangelogFormatter` is exported for programmatic use. The
    Markdown formatter also renders raw-`todo` scenarios with an _(planned)_
    heading suffix.
  - **Planned scenarios (core, vitest, jest, react)**: a bodyless
    `it.todo("title")` — which never runs `story.init()` and previously
    vanished from the docs — is now emitted as a planned scenario (raw status
    `todo`, title only, no steps) when its file contains at least one story
    test; files containing only todos still produce nothing. `ReportScenario`
    gains an optional `planned?: boolean` (schema-additive, no breaking change
    for StoryReport v1 consumers), and the HTML report shows a **Planned**
    badge instead of Pending.

- Updated dependencies [fe8cd62]
  - executable-stories-react@0.3.0

## 1.0.1

### Patch Changes

- Updated dependencies [b905ea9]
  - executable-stories-react@0.2.1

## 1.0.0

### Minor Changes

- d7c4661: Initial release: a first-class Astro integration + Content Layer loader for
  executable-stories living docs.
  - `executableStories()` integration injects routes for a stories index
    (`/stories`), per-scenario detail pages (`/stories/<slug>`), and a searchable
    Scenario Explorer (`/explorer`).
  - Renders those routes **inside the Starlight shell** (sidebar, global search,
    theme toggle) when the site uses Starlight, and as standalone pages otherwise
    — auto-detected, with a `shell: 'auto' | 'starlight' | 'standalone'` override.
    `@astrojs/starlight` is an optional peer dependency, so non-Starlight sites are
    unaffected. Scenario URLs are short, readable title slugs.
  - `storiesLoader()` turns the test run JSON into a hot-reloading `stories`
    collection; `trajectoryLoader()` exposes the session run-trajectory; an
    `authoredDocsLoader` auto-titles plain markdown.
  - Ships `render-doc-entry`, `verification`, `report-health`, and the
    `VerifiedBy` / `Trajectory` / `HealthDashboard` / `ApiOperations` components.
  - Themeable story pages via `theme: { preset, accent, tokens }` — built-in
    palettes (`terminal`/`minimal`/`vibrant`) plus per-token `--es-*` overrides,
    applied in both the standalone and Starlight-shell modes and scoped to the
    story content so the host's chrome is untouched.
  - `collection`, `routeBase`, and `explorerBase` are honoured everywhere
    (renaming the collection or root-mounting the routes both work).
  - First-run onboarding: before any test run, the pages show a getting-started
    panel naming the exact run-JSON path being watched and the `rawRunPath` wiring,
    and the dev/build terminal prints a matching preflight that pre-empts Astro's
    "collection is empty" notice.
  - Depends on `executable-stories-core` for the shared report/story types.

- d7c4661: Rebuild the React report components on shadcn/ui + Tailwind v4 and render them as islands in the Astro docs site, so the docs site and the formatters' HTML report draw from one component implementation.
  - **executable-stories-react**: the report surfaces (`ReportSummary`, `ReportFeature`, `ReportScenario`, `ReportSteps`, `ReportEmpty`) and the `Doc*` kinds are rebuilt on shadcn primitives (`Card`, `Badge`, `Alert`, `Empty`, `Command`) themed to the HTML report palette — IBM Plex, status tints, and the green keyword-column steps with And/But continuation. Status text colours are darkened to meet WCAG AA. New `ScenarioExplorer` component (a shadcn `Command`-based searchable/filterable scenario list), a `hideTitle` prop on `ReportScenario`, and a matching `hideHeader` prop on `ReportInteractive` (for pages that own the title heading). Accessibility fixes that apply to every surface (standalone HTML + Astro): scrollable code/table/diagram blocks are now keyboard-focusable (`tabindex`), and the interactive failure banner uses the AA-safe failed colour. Ships a precompiled `executable-stories-react/tailwind.css` (theme + utilities only, **no preflight**, with a scoped `.es-report-island` reset) so the components embed in host sites without a global reset leaking. Adds a Storybook (`@storybook/react-vite`) component-test tier (`@storybook/addon-vitest` play functions + `@storybook/addon-a11y`).

    Note: component markup moved from `.es-*` class names to shadcn `data-slot` attributes + Tailwind utility classes. Consumers that targeted the old class names for styling should migrate to the `--es-*` token overrides or the `data-slot` hooks.

  - **executable-stories-astro**: the docs site now renders the SAME React report components the standalone single-file HTML report uses, so the two surfaces look and behave identically. The scenario detail route renders `<ReportScenario hideTitle>` as a static island; the stories index renders the full report as one interactive `<ReportInteractive>` island (search, status/tag filters, collapse, copy actions) reconstructed from the `stories` collection. `executable-stories-react`, `@astrojs/react`, `react`, and `react-dom` are peer dependencies; consumers install them and add `react()` to their Astro config (the integration warns at startup if no React renderer is registered — Astro requires framework renderers to be registered by the project).

### Patch Changes

- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0
  - executable-stories-react@0.2.0
