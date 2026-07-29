# executable-stories-astro

## 7.4.0

### Minor Changes

- a0aeaf6: State snapshots, persona-lens follow-ups, and an LLM-paste output format.

  **New `state` doc kind** — `story.state({ label?, value })` captures what the world looks like at a step as a JSON-serializable snapshot (e.g. the Basket after adding an item). Storyboards are no longer screenshot-only: a step carrying a screenshot or state docs becomes a filmstrip frame, consecutive same-label snapshots render as diffs derived at render time (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Journey pages show each chapter's final state card, and `/states` gives non-UI scenarios data-card thumbnails. HTML and Astro render diff-first cards, Markdown shows compact diff summaries with a collapsed snapshot, and story-report-json/MCP carry the entries via the schema; JS adapters warn above ~100KB per snapshot.

  **Design context strip** (`executable-stories-astro`) — `story.link()` docs pointing at a design tool (Figma, Zeplin, Sketch) or labelled "Design ..." now render as a **Design** strip at the top of story pages and journey pages, so designers land on the mockup next to the proof. Pure presentation over existing docs, no new story API. New exports: `designLinks()`, `isDesignLink()`, `<DesignContext/>`.

  **Journey run history** (`executable-stories-astro`) — point the config's new `historyFile` at the store the CLI's `--history-file` maintains and journey pages show a journey-level badge ("7/10 recent runs passed · flaky"), aggregated from the member scenarios' histories: a journey fails a run when ANY member failed it. Same status-transition flakiness classification as the CLI and report island. New exports: `journeyRunHistory()`, `aggregateJourneyHistory()`, `readHistoryStore()`.

  **Environment drift page** (`executable-stories-astro`) — sites with two or more `sources` (staging vs production, one run per repo in a docs hub) get a `/drift` page: every scenario's status per source side by side, mismatches floated to the top, including scenarios absent from one source. Injected automatically with ≥2 sources; `injectDrift`/`driftBase` override. New exports: `extractDrift()`, `driftEnabled()`.

  **Evidence grade in the traceability CSV** (`executable-stories-formatters`) — `traceability-csv` gains an `evidence_grade` column: the same weak → strong grading the Evidence Review applies (screenshot, OTEL trace, mutation score, failing-first verification), so the auditor spreadsheet says not just "passed" but how credible the proof is.

  **Regression storyboards in `compare`** (`executable-stories-formatters`) — the run-diff HTML report now renders a step-screenshot filmstrip on every scenario whose status flipped (regressed or fixed), so triage starts from what the product looked like, not a stack trace. Frames come from the same step-attached screenshots the report filmstrip uses.

  **New `agent-text` output format** (`executable-stories-formatters`) — the full run (steps, doc entries, errors) as flat, token-lean plain text for pasting into an LLM. Same content as the Markdown report minus everything a model never reads (ids, hashes, durations, source lines, JSON punctuation), with a self-describing header so the model knows how to read the block. ~12x smaller than the HTML report on a real 74-scenario run. Added to the `agent` preset; writes `<name>.agent.txt`.

### Patch Changes

- Updated dependencies [a0aeaf6]
  - executable-stories-react@0.8.0

## 7.3.0

### Minor Changes

- 28ea159: Stakeholder living docs: visual storyboards and persona views.

  **Visual storyboards** — scenarios whose steps carry screenshots (e.g. Playwright `story.screenshot({ page, alt })` after each step) now render a horizontal filmstrip — Given → When → Then, each frame a thumbnail linking to its step — above the step list in the HTML report and on Astro story pages. Derived, not authored: `extractStoryboardFrames()` (new in `executable-stories-core/storyboard`) reads the step docs the tests already emit, and the new `<ReportStoryboard/>` component renders them. Appears automatically from 2 frames up; hydration-free, so it works in static Astro islands.

  **Persona views** — `views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }]` in `defineExecutableStories()` mounts filtered, re-grouped indexes at their own URLs, one per audience (product, design, support, QA). Each renders the same interactive index as `/stories` through its lens, appears in the sidebar under "Audiences" via `storiesSidebar()`, and explains itself when its tags match nothing yet. New exports: `resolveViews`, `matchView`, `viewReport`, `PersonaView`.

  **Journeys** — tag scenarios `journey:<id>[:<order>]` and each id becomes an ordered multi-scenario walkthrough at `/journeys/<id>` (configurable via `journeysBase`/`injectJourneys`): member scenarios in tag order as full cards — storyboards included — under one aggregate status (`failed` if any member failed, `passed` only when all passed). A tag convention, not a new API, so it works in every adapter today. `extractJourneys()`/`parseJourneyTag()` are new in `executable-stories-core`; embed a journey in MDX with `<StoryJourney id="..."/>`.

  **UI-state catalog** — `state:<name>` tags feed `/states` (configurable via `statesBase`/`injectStates`): a thumbnail grid of the UI states the product verifiably has, each card a scenario's first storyboard frame linking to its story page, with `viewport:mobile`/`viewport:desktop` variants side by side within their state.

  **Traceability CSV** — new `traceability-csv` output format in `executable-stories-formatters`: the traceability matrix as flat RFC-4180 CSV for auditors and spreadsheets, one row per requirement-scenario pair plus a row per untraced scenario. Same derivation as `traceability-matrix`, so the two can never disagree.

### Patch Changes

- Updated dependencies [28ea159]
  - executable-stories-react@0.7.0

## 7.2.0

### Minor Changes

- ff9dfe1: Astro artifact UX, CLI parity for non-JS adapters, and report triage defaults

  **Astro: embeddable scenarios and agent-readable endpoints.**
  - New `<StoryScenario/>` (full scenario card: steps, status, failure output, docs) and `<StoryStatus/>` (inline linked status pill) let hand-written MDX embed live scenarios. Both resolve by stable scenario id, URL slug, or exact title, and show a visible callout when the reference stops matching, so embedded evidence never silently disappears.
  - `agentEndpoints` (default on) injects `/llms.txt` (an llms.txt-format index of every scenario) and a plain-Markdown twin of each story page at `<routeBase>/<slug>.md`. A published site is now consumable by agents and `curl`, not only browsers, and static builds prerender them as real files.
  - The report-island pre-bundle (`optimizeDeps.include`) and React dedupe now ship inside `executableStories()`, so the "Outdated Optimize Dep" fix arrives with `pnpm update executable-stories-astro`. Scaffolds no longer carry a `vite` block.
  - The integration watches a nav-manifest that the loader rewrites whenever a run changes the feature/scenario tree, so the Starlight sidebar stays fresh in dev. Status-only changes keep hot-reloading.

  **One scenario-to-Markdown serializer.** `scenarioToMarkdown` lives in `executable-stories-core` and backs both the HTML report's "Copy as Markdown" button and the Astro `<slug>.md` endpoints, so a scenario copies the same either way. `variant: "compact"` renders the paste-sized excerpt; the default renders the standalone document.

  **Non-JS adapters reach the CLI with less friction.**
  - `format` (and the other file-taking commands) resolve `.executable-stories/raw-run.json`, then `reports/raw-run.json`, when given no path, and print the resolved path to stderr.
  - New `executable-stories doctor` diagnoses the run JSON: where it is, whether it parses, its `schemaVersion` against what the CLI supports, and what it contains. It names cross-language drift ("your adapter is newer than the CLI") plainly instead of surfacing it as a deep validation error.
  - Each of these adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) emits a `$schema` pointer as the first key so editors validate the file as it is written, and prints the exact next command after writing (silence with `EXECUTABLE_STORIES_QUIET`). The JS/TS reporters render in-process, so they keep writing plain run JSON.

  **CLI ergonomics.**
  - `--preset agent|ci|docs` expands to a format bundle, and unions with `--format` when both are passed.
  - `--open` opens the generated HTML report.
  - `format` prints a one-line summary (`✔ 12 scenarios (11 passed, 1 failed) → reports/index.html in 84ms`) instead of finishing silently.
  - `executable-stories completion bash|zsh|fish`.
  - Colocated output writes an `index.html` that links every per-file report, failures first. It skips that index (with a warning) when a report already occupies `index.html`, so it never overwrites an aggregate report of that name.

  **Report opens as a triage surface.** A run with failures collapses passing work to its titles, expands failures, and floats features that contain failures to the top. All-green runs are unchanged, and a saved collapse preference always wins, so this only seeds a first visit.

  **Fixes** the scaffolded sample run JSON, which used `schemaVersion: "1.0"` (a string) where the schema requires the integer `1`. The Astro loader tolerated it but `executable-stories format` rejected it.

### Patch Changes

- Updated dependencies [ff9dfe1]
  - executable-stories-react@0.6.0

## 7.1.0

### Minor Changes

- a536e42: Redesign the HTML report UI on shadcn/Base UI components.
  - Typography and tokens: switch the report to Geist + Geist Mono and a larger corner radius, applied across the standalone report, the React island, and the shared `--es-*` theme contract.
  - Summary: flat neutral KPI cards with a monospace label, a status dot, and an oversized tabular number coloured by status, replacing the tinted pastel cards.
  - Header: the theme control moves to the top-right beside search; "Expand all" and "Show documentation" become Base UI switches; status and tag filters sit above the view controls, separated by a divider.
  - Status hierarchy: passed, skipped, and pending badges are quiet outlines, and the passing pill is dropped entirely (the check glyph and title carry it, with an sr-only status for screen readers). Only a failure keeps a filled badge, so a broken run stands out.
  - Tags: the filter list collapses to one row behind a "+N more" toggle on tag-heavy reports, and selecting a tag no longer reflows its neighbours.
  - New Base UI `Switch` primitive; the keyboard-shortcuts dialog is rebuilt on an aligned grid with a corrected `aria-keyshortcuts`.
  - Astro embed: feature and scenario navigation folds into the Starlight sidebar and the report renders full-width.
  - Astro packaging: `executable-stories-react` moves from a required peer dependency to a direct dependency, so consumers no longer install it separately, and the package version realigns to the 7.x line to track the supported Astro major.

### Patch Changes

- Updated dependencies [a536e42]
  - executable-stories-react@0.5.0

## 3.0.1

### Patch Changes

- 393b095: Relicense from MIT to Apache-2.0.

  All packages are now published under the Apache License, Version 2.0, and
  every package tarball ships its own LICENSE file. Several packages
  (`executable-stories-astro`, `-cypress`, `-demo`, `-jest`, `-playwright`)
  previously published with no `license` field at all; that is fixed.

  Versions published before this change remain available under MIT. The
  Executable Stories name and logo are trademarks and are not granted by the
  code licence — see TRADEMARKS.md in the repository.

- Updated dependencies [393b095]
  - executable-stories-react@0.4.1

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
