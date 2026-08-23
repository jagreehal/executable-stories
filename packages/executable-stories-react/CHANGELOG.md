# executable-stories-react

## 0.11.0

### Minor Changes

- c8fe24a: Let a file declare what its scenarios are for, take any framework's results, and stop losing switched-off scenarios in a count

  **A file can say why its feature exists.** A scenario says what the system does; nothing said who it serves. `story.feature(...)`, in all eleven adapters, declares a title, a kind (`feature`, `ability`, or `business-need`), a markdown narrative, and a glossary, and the report opens with that before the examples. Files that declare nothing render exactly as they did. Tags on a declaration now reach every scenario in its file, which is what they were documented to do and the reason to write one on the declaration rather than on each scenario. Go and Rust scenarios record the file they were written in, so a declaration made in `init()` or through `declare_feature!` reaches them instead of leaving every scenario under "unknown". Playwright keys declarations on the declaring file: a worker reused across specs used to hand one file's feature to the next, and the reporter recorded it against a file that never wrote one.

  **Less per-test ceremony in three adapters.** Rust required `story.pass()` in every passing test; a story dropped without it recorded a failure, so a forgotten call turned a green test red in the docs only. Status now comes from whether the thread is unwinding. `#[test]` functions returning `Result` are the one case that cannot be detected, since returning `Err` never panics: pass the fallible call through `story.record_result(...)` or call `story.fail()`. Ruby required `story.record(status: "pass", ...)` after the assertions, which a failing test never reached, so failures were the one thing the report could not show; `require "executable_stories/minitest"` now hooks `after_teardown`. xUnit required `Story.RecordAndClear()` per test wrapped in try/catch, and one `[assembly: StoryRecording]` now covers a whole test project.

  **`push` takes any framework's results.** It already took a StoryReport or a raw run, and now also takes JUnit XML, Playwright's JSON reporter, and an allure-results directory, which the cloud converts at the edge. The format is detected from what you point at rather than selected by subcommand, and `--format story|junit|playwright|allure` overrides when detection guesses wrong; a declared `schemaVersion` always wins, so a StoryReport is never mistaken for something else. Foreign formats upload verbatim so the conversion rules live in one place instead of drifting between the server and every version of this CLI in the wild. An allure-results directory is read the way Allure writes it, and change metadata is capped to fit in a request URL so a large PR cannot lose its run to a 414.

  **`--force` keeps a blinking endpoint out of your build.** A CI job that goes red because the reporting endpoint blinked teaches people to stop reporting. It covers the wire, never the verdict: `--gate` still runs after a forced failure and still exits 5 on a blocked release, because a release blocked against a commit was blocked before the push and is not un-blocked by the push failing to land.

  **`check` names switched-off scenarios instead of counting them.** A run could stop validating forty specs and still print `All scenarios green.` under a `40 skipped` count, which is how a turned-off spec gets forgotten. Each one is now listed with its location and its ticket, or `no ticket`, and such a run reads `All running scenarios green.` Planned (`it.todo`) scenarios are a spec waiting for code rather than one you stopped validating, so they stay out of that list. `--max-skipped <n>` puts a budget on it and exits 5 when it is exceeded — worth setting to 0 in an agent loop, where making a scenario skip is the cheapest way out of a red run.

  **Explorer filters live in the URL.** `?q`, `?status`, and `?tag` are read on load and written back as you filter, so `/explorer/?tag=capability:checkout` is an address a ticket can hold. Link by tag rather than at one scenario's page: specifications get renamed, moved, split, and merged as the domain model changes, and a tag survives all four. A tag with nothing behind it renders empty, so a link that has gone stale says so instead of quietly reading as green.

  **The formatters package is lint clean and has a `lint` script**, so `pnpm quality` covers it. Most of the 64 accumulated errors were dead weight, but `build-gherkin-document` computed a resolved keyword type for And/But steps and then emitted the raw one, so the inheritance that block was written for never applied; the AST is right to keep `Conjunction` there and `resolvePickleStepTypes` already does the inheritance where it belongs. Modules that were only named `index.ts` now have names that say what they are — `report-generator.ts`, `compare/diff-runs.ts`, `deploy/deployments.ts`, `notifiers/send-notifications.ts`, `sync/adapters/registry.ts`, `formatters/cucumber-messages/formatter.ts` — with `index.ts` re-exporting them, so nothing changes for anyone importing the package. For core, `canonicalizeRun` moves into the new `converters/acl/canonicalize` subpath, and `converters/acl/index` still re-exports it.

### Patch Changes

- Updated dependencies [c8fe24a]
  - executable-stories-core@0.20.0

## 0.10.1

### Patch Changes

- 6ce9ac2: Consume `executable-stories-core` as a published dependency instead of bundling it.

  `executable-stories-core` is now published to npm, so the packages that share its
  types and converters declare it as a real dependency rather than inlining it at
  build time. This removes the `noExternal` / `dts.resolve` workarounds from five
  tsup configs and the `paths` aliases from two tsconfigs, and it stops five
  published dists from each shipping their own copy of the ACL and converter code
  (a copy that could silently diverge when packages released at different times
  were installed together).

  The framework adapters (Vitest, Jest, Playwright, Cypress) now take their shared
  story types, `STORY_META_KEY`, and the OTel/doc-builder helpers from
  `executable-stories-core` instead of routing them through
  `executable-stories-formatters`. The Jest, Playwright, and Cypress story APIs no
  longer load the formatters package at test time at all; Cypress in particular no
  longer needs its special-case import to keep `node:fs` out of the browser bundle.

  `tryGetActiveOtelContext`, `resolveTraceUrl`, and `OtelTraceContext` moved from
  `executable-stories-formatters` into `executable-stories-core/utils/otel-detect`.
  They are still re-exported from `executable-stories-formatters`, so no public API
  changes.

- Updated dependencies [6ce9ac2]
  - executable-stories-core@0.19.0

## 0.10.0

### Minor Changes

- 4c1cd51: Narrative blocks, planned scenarios in every adapter, and marked authorship

  **Narrative blocks.** Two `story.custom` types render in every report surface with
  no setup: `file-tree` (directories derived from a flat path list) and
  `data-model` (fields as a table). They ride the existing custom-entry API, so all
  eleven adapters can emit them without an adapter change. Both take an optional
  `change` of `added` / `modified` / `removed` / `renamed`, rendered as an
  uncoloured badge, because colour in this report means test status and a green
  "added" beside a failing scenario would misread. A payload that does not parse
  renders as its raw data marked "unrecognised shape" rather than vanishing.
  Exported as `FileTreeBlock`, `DataModelBlock`, and `narrativeBlockRenderers`; a
  `customRenderers` entry for the same type still wins.

  **Marked authorship.** `authored: "agent"` on either payload renders
  "AI-authored, not verified by a run". A block drawn from a diff never executed,
  and left unmarked it would sit beside real evidence looking equally trustworthy.

  **Planned scenarios everywhere.** `RawStatus` has always had `todo`, the ACL has
  always turned it into `scenario.planned`, and both formatters have always
  rendered it. Only Vitest and Jest ever emitted one. Playwright now reads
  `test.fixme("title")` off the suite in `onEnd`, and Cypress reads a bodyless
  `it("title")`, which Mocha reports as pending with no `fn`. `it.skip(title, fn)`
  keeps its body and stays a skip. Both keep the rule that only files containing
  real story tests contribute.

  The six non-JS adapters gain an explicit call: `es.Planned(t, "…")` in Go,
  `ExecutableStories.planned` in Ruby, `Story::planned` in Rust, `story.planned` in
  pytest, `Story.planned` in JUnit 5, and `Story.Planned` in xUnit. They take a
  call rather than reusing `t.Skip`, `@Disabled`, `#[ignore]`, or `Skip = "…"`,
  because those mean "do not run this now", which is a different claim from "we
  have not built this yet". Conflating them would drop every quarantined test into
  your plan.

  A planned declaration only becomes `todo` when the test itself came out clean.
  Code after the declaration can still fail, and reporting that failure as
  "planned" would hide a broken test behind a plan, so pytest, JUnit 5, and Go keep
  the real outcome. Ruby, Rust, and xUnit record at the point of the call because
  their hosts offer no later hook; their docs say so.

  Playwright deduplicates by test id, and its planned cases carry `projectName`
  like every other scenario. A story that runs and then calls `test.fixme()` is
  already collected as skipped and would otherwise have been counted a second time
  as planned; eligibility is keyed on project plus source file, so a spec with
  story tests under one project does not vouch for another. Ruby fills the source
  location from the caller, so a planned scenario sits with the rest of its file
  instead of under an unknown feature.

  Each example app now declares a planned scenario, and `validate_raw_run` fails
  any adapter whose run contains none, so the parity cannot quietly rot.

## 0.9.0

### Minor Changes

- 075d71e: Partial-run compares, view state in the URL, and visible mermaid failures

  **`compare` / `gate-release --partial`.** A filtered local run or a CI shard
  compared against a full baseline reported every untouched scenario as removed,
  failing `--fail-on-removal` for tests the run was never asked to execute. With
  `--partial`, the current run's own source files define its scope: baseline
  scenarios outside that scope are counted as `notRun` in the diff summary (and
  reported in the markdown, HTML, and PR summaries) instead of being classified as
  removed. Off by default, since a deleted file and an unselected file are
  indistinguishable from the run alone, and guessing wrong would hide a real
  deletion from a release gate. `diffRuns(baseline, current, { partialCurrent:
true })` exposes the same behaviour to API consumers.

  **View state in the URL.** Search, status filter, active tags and the
  documentation toggle are mirrored into the URL fragment, so refreshing keeps the
  view and a filtered report can be pasted to someone else. The diff report's
  search and kind filter do the same. The fragment rather than the query string:
  the flagship surface is a single HTML file opened from disk, where a `file://`
  document has an opaque origin. Format is `#<scenario-id>?q=...`, so existing
  scenario permalinks are unchanged and a deep link now survives alongside the
  filters.

  **Mermaid failures are visible.** Diagrams are validated with the library's own
  `mermaid.parse()` before rendering. A diagram with a syntax error now shows the
  error message above its source instead of silently degrading to a code block. A
  missing library (offline, blocked CDN) still falls back quietly, since that is
  not the author's mistake.

## 0.8.0

### Minor Changes

- a0aeaf6: State snapshots, persona-lens follow-ups, and an LLM-paste output format.

  **New `state` doc kind** — `story.state({ label?, value })` captures what the world looks like at a step as a JSON-serializable snapshot (e.g. the Basket after adding an item). Storyboards are no longer screenshot-only: a step carrying a screenshot or state docs becomes a filmstrip frame, consecutive same-label snapshots render as diffs derived at render time (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Journey pages show each chapter's final state card, and `/states` gives non-UI scenarios data-card thumbnails. HTML and Astro render diff-first cards, Markdown shows compact diff summaries with a collapsed snapshot, and story-report-json/MCP carry the entries via the schema; JS adapters warn above ~100KB per snapshot.

  **Design context strip** (`executable-stories-astro`) — `story.link()` docs pointing at a design tool (Figma, Zeplin, Sketch) or labelled "Design ..." now render as a **Design** strip at the top of story pages and journey pages, so designers land on the mockup next to the proof. Pure presentation over existing docs, no new story API. New exports: `designLinks()`, `isDesignLink()`, `<DesignContext/>`.

  **Journey run history** (`executable-stories-astro`) — point the config's new `historyFile` at the store the CLI's `--history-file` maintains and journey pages show a journey-level badge ("7/10 recent runs passed · flaky"), aggregated from the member scenarios' histories: a journey fails a run when ANY member failed it. Same status-transition flakiness classification as the CLI and report island. New exports: `journeyRunHistory()`, `aggregateJourneyHistory()`, `readHistoryStore()`.

  **Environment drift page** (`executable-stories-astro`) — sites with two or more `sources` (staging vs production, one run per repo in a docs hub) get a `/drift` page: every scenario's status per source side by side, mismatches floated to the top, including scenarios absent from one source. Injected automatically with ≥2 sources; `injectDrift`/`driftBase` override. New exports: `extractDrift()`, `driftEnabled()`.

  **Evidence grade in the traceability CSV** (`executable-stories-formatters`) — `traceability-csv` gains an `evidence_grade` column: the same weak → strong grading the Evidence Review applies (screenshot, OTEL trace, mutation score, failing-first verification), so the auditor spreadsheet says not just "passed" but how credible the proof is.

  **Regression storyboards in `compare`** (`executable-stories-formatters`) — the run-diff HTML report now renders a step-screenshot filmstrip on every scenario whose status flipped (regressed or fixed), so triage starts from what the product looked like, not a stack trace. Frames come from the same step-attached screenshots the report filmstrip uses.

  **New `agent-text` output format** (`executable-stories-formatters`) — the full run (steps, doc entries, errors) as flat, token-lean plain text for pasting into an LLM. Same content as the Markdown report minus everything a model never reads (ids, hashes, durations, source lines, JSON punctuation), with a self-describing header so the model knows how to read the block. ~12x smaller than the HTML report on a real 74-scenario run. Added to the `agent` preset; writes `<name>.agent.txt`.

## 0.7.0

### Minor Changes

- 28ea159: Stakeholder living docs: visual storyboards and persona views.

  **Visual storyboards** — scenarios whose steps carry screenshots (e.g. Playwright `story.screenshot({ page, alt })` after each step) now render a horizontal filmstrip — Given → When → Then, each frame a thumbnail linking to its step — above the step list in the HTML report and on Astro story pages. Derived, not authored: `extractStoryboardFrames()` (new in `executable-stories-core/storyboard`) reads the step docs the tests already emit, and the new `<ReportStoryboard/>` component renders them. Appears automatically from 2 frames up; hydration-free, so it works in static Astro islands.

  **Persona views** — `views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }]` in `defineExecutableStories()` mounts filtered, re-grouped indexes at their own URLs, one per audience (product, design, support, QA). Each renders the same interactive index as `/stories` through its lens, appears in the sidebar under "Audiences" via `storiesSidebar()`, and explains itself when its tags match nothing yet. New exports: `resolveViews`, `matchView`, `viewReport`, `PersonaView`.

  **Journeys** — tag scenarios `journey:<id>[:<order>]` and each id becomes an ordered multi-scenario walkthrough at `/journeys/<id>` (configurable via `journeysBase`/`injectJourneys`): member scenarios in tag order as full cards — storyboards included — under one aggregate status (`failed` if any member failed, `passed` only when all passed). A tag convention, not a new API, so it works in every adapter today. `extractJourneys()`/`parseJourneyTag()` are new in `executable-stories-core`; embed a journey in MDX with `<StoryJourney id="..."/>`.

  **UI-state catalog** — `state:<name>` tags feed `/states` (configurable via `statesBase`/`injectStates`): a thumbnail grid of the UI states the product verifiably has, each card a scenario's first storyboard frame linking to its story page, with `viewport:mobile`/`viewport:desktop` variants side by side within their state.

  **Traceability CSV** — new `traceability-csv` output format in `executable-stories-formatters`: the traceability matrix as flat RFC-4180 CSV for auditors and spreadsheets, one row per requirement-scenario pair plus a row per untraced scenario. Same derivation as `traceability-matrix`, so the two can never disagree.

## 0.6.0

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

## 0.5.0

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

## 0.4.1

### Patch Changes

- 393b095: Relicense from MIT to Apache-2.0.

  All packages are now published under the Apache License, Version 2.0, and
  every package tarball ships its own LICENSE file. Several packages
  (`executable-stories-astro`, `-cypress`, `-demo`, `-jest`, `-playwright`)
  previously published with no `license` field at all; that is fixed.

  Versions published before this change remain available under MIT. The
  Executable Stories name and logo are trademarks and are not granted by the
  code licence — see TRADEMARKS.md in the repository.

## 0.4.0

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

## 0.3.0

### Minor Changes

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

## 0.2.1

### Patch Changes

- b905ea9: Fix broken screenshots surfacing as raw `/home/runner/work/...` image links in
  PR comments and a bare, un-labeled broken `<img>` in HTML reports — plus a new
  `story.screenshot({ page, alt })` form that removes the root cause.
  - **executable-stories-playwright**: `story.screenshot({ path })` now warns
    (`console.warn`) at the call site when the file can't be read, instead of
    silently falling back to the raw path and only surfacing the problem minutes
    later as a broken image in CI. The far more common cause is a missing
    `page.screenshot({ path })` call, or a `path` that doesn't match — the
    warning names the exact path and suggests the fix.
    Add `story.screenshot({ page, alt })`: captures the screenshot itself from
    the in-memory buffer and inlines it as a `data:` URI directly, with no
    filesystem round-trip at all — so there's no path for the two calls to fall
    out of sync, and nothing for Playwright's per-test output cleanup to delete
    before the report is built. `path` is still accepted alongside `page` if you
    also want the file written to disk. The existing `{ path }`-only form still
    works unchanged for screenshots captured elsewhere.
    Inline step docs (`story.then(text, { screenshot: { path } })`) now inline
    existing files as `data:` URIs too, matching `story.screenshot()` — this
    path previously never embedded the file no matter how it was captured.
    `story.video()` also now warns when given an absolute path that doesn't
    exist yet — video bytes are never inlined (too large for a `data:` URI),
    so it had no equivalent signal at all before; a relative path (resolved
    later by the asset bundler) is unaffected.
  - **executable-stories-formatters**: the Markdown formatter no longer emits
    `![alt](path)` / `<source src="path">` for a screenshot or video whose path
    is a bare local filesystem path rather than a `data:`/`http(s):` URI or a
    bundler-resolvable relative path. `story.video()` never inlines (video
    bytes are too large) and only ever resolves through a downstream asset
    bundler, so an absolute path reaching Markdown means that step didn't run —
    most commonly because the Markdown was posted straight to a GitHub PR
    comment, with no bundling step in between. Embedding it verbatim guarantees
    a broken reference everywhere that Markdown is rendered. Both now render a
    plain "Screenshot/Video unavailable" note naming the path instead.
  - **executable-stories-react**: restore the "Screenshot unavailable" /
    "Video unavailable" placeholder for local-filesystem screenshot/video paths
    that the HTML report's asset bundler couldn't resolve — a regression from
    the React rendering rewrite where `DocScreenshot` rendered a bare `<img
src>` and `DocVideo` a bare `<video src>` with no fallback for either. Also
    route `DocScreenshot`'s `src` through the same scheme allow-list already
    used by `DocVideo`/`DocHtml` (`data:image/*`, `http(s):`, or relative only)
    instead of passing the report-supplied path straight into the DOM.

## 0.2.0

### Minor Changes

- d7c4661: Rebuild the React report components on shadcn/ui + Tailwind v4 and render them as islands in the Astro docs site, so the docs site and the formatters' HTML report draw from one component implementation.
  - **executable-stories-react**: the report surfaces (`ReportSummary`, `ReportFeature`, `ReportScenario`, `ReportSteps`, `ReportEmpty`) and the `Doc*` kinds are rebuilt on shadcn primitives (`Card`, `Badge`, `Alert`, `Empty`, `Command`) themed to the HTML report palette — IBM Plex, status tints, and the green keyword-column steps with And/But continuation. Status text colours are darkened to meet WCAG AA. New `ScenarioExplorer` component (a shadcn `Command`-based searchable/filterable scenario list), a `hideTitle` prop on `ReportScenario`, and a matching `hideHeader` prop on `ReportInteractive` (for pages that own the title heading). Accessibility fixes that apply to every surface (standalone HTML + Astro): scrollable code/table/diagram blocks are now keyboard-focusable (`tabindex`), and the interactive failure banner uses the AA-safe failed colour. Ships a precompiled `executable-stories-react/tailwind.css` (theme + utilities only, **no preflight**, with a scoped `.es-report-island` reset) so the components embed in host sites without a global reset leaking. Adds a Storybook (`@storybook/react-vite`) component-test tier (`@storybook/addon-vitest` play functions + `@storybook/addon-a11y`).

    Note: component markup moved from `.es-*` class names to shadcn `data-slot` attributes + Tailwind utility classes. Consumers that targeted the old class names for styling should migrate to the `--es-*` token overrides or the `data-slot` hooks.

  - **executable-stories-astro**: the docs site now renders the SAME React report components the standalone single-file HTML report uses, so the two surfaces look and behave identically. The scenario detail route renders `<ReportScenario hideTitle>` as a static island; the stories index renders the full report as one interactive `<ReportInteractive>` island (search, status/tag filters, collapse, copy actions) reconstructed from the `stories` collection. `executable-stories-react`, `@astrojs/react`, `react`, and `react-dom` are peer dependencies; consumers install them and add `react()` to their Astro config (the integration warns at startup if no React renderer is registered — Astro requires framework renderers to be registered by the project).

### Patch Changes

- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0

## 0.1.16

### Patch Changes

- Updated dependencies [99072d1]
  - executable-stories-formatters@0.17.0

## 0.1.15

### Patch Changes

- Updated dependencies [31cce46]
  - executable-stories-formatters@0.16.0

## 0.1.14

### Patch Changes

- Updated dependencies [e3f8c5b]
  - executable-stories-formatters@0.15.1

## 0.1.13

### Patch Changes

- Updated dependencies [424b22c]
  - executable-stories-formatters@0.15.0

## 0.1.12

### Patch Changes

- Updated dependencies [6374d1b]
  - executable-stories-formatters@0.14.0

## 0.1.11

### Patch Changes

- Updated dependencies [e75d26f]
  - executable-stories-formatters@0.13.0

## 0.1.10

### Patch Changes

- Updated dependencies [46c17b9]
  - executable-stories-formatters@0.12.0

## 0.1.9

### Patch Changes

- bed366d: chore: update dependencies

  Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:
  - **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
  - **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
  - **executable-stories-mcp**: `zod` 4.0 → 4.4
  - **executable-stories-formatters**: `yaml` 2.8 → 2.9
  - Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

  Also migrated the workspace build/test tooling to **vite 8** (`vite: ^8` pnpm override; `@vitejs/plugin-react` 4 → 6). vitest 4.1.8 and storybook-vite 10.4.2 already support vite 8, and the astro example/docs apps build cleanly on it. `@types/estree` is pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` otherwise breaks the eslint-plugin type-checks).

  (Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node, vite — are not released as they don't affect consumers of the published packages.)

- Updated dependencies [bed366d]
  - executable-stories-formatters@0.11.4

## 0.1.6

### Patch Changes

- Updated dependencies [c6890c9]
  - executable-stories-formatters@0.11.1

## 0.1.5

### Patch Changes

- Updated dependencies [00854ee]
  - executable-stories-formatters@0.11.0

## 0.1.4

### Patch Changes

- Updated dependencies [f790128]
  - executable-stories-formatters@0.10.0

## 0.1.3

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 0.1.2

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 0.1.1

### Patch Changes

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15
