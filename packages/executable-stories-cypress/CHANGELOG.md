# executable-stories-cypress

## 8.7.0

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
  - executable-stories-formatters@1.12.0

## 8.6.3

### Patch Changes

- Updated dependencies [57e9ea1]
  - executable-stories-formatters@1.11.0

## 8.6.2

### Patch Changes

- Updated dependencies [01df811]
  - executable-stories-formatters@1.10.0

## 8.6.1

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
  - executable-stories-formatters@1.9.2

## 8.6.0

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

### Patch Changes

- executable-stories-formatters@1.9.1

## 8.5.2

### Patch Changes

- Updated dependencies [075d71e]
  - executable-stories-formatters@1.9.0

## 8.5.1

### Patch Changes

- Updated dependencies [50b564a]
- Updated dependencies [73f486c]
  - executable-stories-formatters@1.8.0

## 8.5.0

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
  - executable-stories-formatters@1.7.0

## 8.4.15

### Patch Changes

- Updated dependencies [28ea159]
  - executable-stories-formatters@1.6.0

## 8.4.14

### Patch Changes

- Updated dependencies [ff9dfe1]
  - executable-stories-formatters@1.5.0

## 8.4.13

### Patch Changes

- Updated dependencies [feada36]
  - executable-stories-formatters@1.4.0

## 8.4.12

### Patch Changes

- Updated dependencies [a536e42]
  - executable-stories-formatters@1.3.0

## 8.4.11

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
  - executable-stories-formatters@1.2.1

## 8.4.10

### Patch Changes

- Updated dependencies [af026d1]
  - executable-stories-formatters@1.2.0

## 8.4.9

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
  - executable-stories-formatters@1.1.0

## 8.4.8

### Patch Changes

- Updated dependencies [b905ea9]
  - executable-stories-formatters@1.0.1

## 8.4.7

### Patch Changes

- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0
  - executable-stories-formatters@1.0.0

## 8.4.6

### Patch Changes

- Updated dependencies [99072d1]
  - executable-stories-formatters@0.17.0

## 8.4.5

### Patch Changes

- Updated dependencies [31cce46]
  - executable-stories-formatters@0.16.0

## 8.4.4

### Patch Changes

- e3f8c5b: Harden the living-docs workflow and align adapter documentation with current APIs.
  - **`executable-stories-formatters`**: refuse `build-docs` when `--site-dir` is not a scaffolded Astro site (requires `astro.config.mjs`); share the same `isScaffoldedAstroSite` check with `init-astro --update`; ship `templates/` in the published package and restore `.gitignore` from the npm-safe `gitignore` template filename; clarify CLI help for the init-astro → test → build-docs flow and that `format --format astro` is a single-page primitive
  - **`executable-stories-jest`**: fix `setup` docs to reference `executable-stories-jest` reporter paths and modern `formats` / `outputDir` / `outputName` options
  - **`executable-stories-cypress`**: widen the Cypress peer dependency to `>=13.0.0`; document the `reporter.cjs` entry for Mocha reporter usage
  - **`executable-stories-playwright`**: clarify install instructions and that scenario modifiers should use Playwright's native `test.skip` / `test.only` / etc.
  - **`executable-stories-vitest`**: document the `covers` scenario option in the README
  - **`executable-stories-mcp`**: document the raw-run → StoryReport flow, MCP client registration snippet, and `get_deployment_status` / `get_environment_drift` tools

- Updated dependencies [e3f8c5b]
  - executable-stories-formatters@0.15.1

## 8.4.3

### Patch Changes

- Updated dependencies [424b22c]
  - executable-stories-formatters@0.15.0

## 8.4.2

### Patch Changes

- Updated dependencies [6374d1b]
  - executable-stories-formatters@0.14.0

## 8.4.1

### Patch Changes

- Updated dependencies [e75d26f]
  - executable-stories-formatters@0.13.0

## 8.4.0

### Minor Changes

- 46c17b9: Add the `story.html({ path | url | content, title?, height? })` doc kind for embedding generated HTML (charts, single-file reports, and skill/agent output such as `teach` lessons or architecture reviews) directly in story reports. Exactly one of `path` / `url` / `content` is required.
  - **HTML report:** rendered inside an always-sandboxed `<iframe sandbox="allow-scripts">` (no `allow-same-origin`) with a title bar and an open-in-new-tab control. Embedded scripts run (Tailwind/Mermaid CDN charts work) but cannot reach the report DOM, cookies, or storage. Local files are inlined as `srcdoc` by default so the report stays self-contained; under `--asset-mode copy` they are copied as hashed assets. `height` accepts a number (px) or string (e.g. `"60vh"`), default 400px.
  - **Other formats degrade gracefully:** Markdown (link / collapsible code block), JUnit (text line), Cucumber JSON (`text/html` embedding), Confluence (link / code block).
  - **Adapters:** `story.html(...)` plus the inline `html` key on step docs across Vitest, Jest, Playwright, and Cypress. Playwright inlines local files at capture time so they survive per-test `outputDir` cleanup.
  - **Cross-language parity:** the Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters gain the same `html` doc kind (published via their own registries), each enforcing the exactly-one-source rule idiomatically.

  See the [Embedding skill & agent HTML output](https://github.com/jagreehal/executable-stories) guide for the sandbox-safe authoring contract and `content`-vs-`path` source guidance.

### Patch Changes

- Updated dependencies [46c17b9]
  - executable-stories-formatters@0.12.0

## 8.3.4

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

## 8.3.1

### Patch Changes

- Updated dependencies [c6890c9]
  - executable-stories-formatters@0.11.1

## 8.3.0

### Minor Changes

- 00854ee: First-class video support and an expanded docs/agent toolchain.
  - **Adapters (Vitest, Jest, Playwright, Cypress):** add `story.video({ path, caption?, poster? })` doc kind and the `covers` story option (product-code paths/globs a scenario exercises). Playwright also auto-attaches its recorded run video.
  - **Formatters:** render the new `video` doc entry across HTML, Markdown, Confluence, and Astro outputs.
  - **Formatters CLI:** new `build-docs`, `check-links`, `watch`, `scaffold-doc`, and `import-openapi` commands.
  - **Formatters artifacts:** add the behavior-manifest JSON, scenario-index JSON, and coverage-index outputs alongside StoryReport v1.
  - **Astro template:** new Explorer page plus `HealthDashboard`, `VerifiedBy`, `VerifiedStep`, `ApiOperations`, `Checklist`, and `PageTitle` components, with verification/report-health helpers and global token styles.

### Patch Changes

- Updated dependencies [00854ee]
  - executable-stories-formatters@0.11.0

## 8.2.0

### Minor Changes

- f790128: Add agent-oriented artifacts, an MCP server, and cross-language code→behavior linking.
  - **executable-stories-formatters:** Two output formats — `scenario-index-json` (Storybook-like scenario index, schema v1) and `behavior-manifest-json` (source-file rollups, tag index, doc coverage, debugger warnings). New scenario field **`covers`** (product-code paths/globs) carried through the StoryReport contract, plus `scenariosCoveringPaths` (code→scenario) and `diffStoryReports` (behavior diff) helpers. The behavior manifest gains a `missing-covers` debugger warning; `executable-stories list --list-format json` now includes `covers`. New **`watch`** subcommand (and `startWatch`/`regenerateArtifacts` API) regenerates agent artifacts whenever the raw-run file changes — a live, language-agnostic behavior index. The scaffolded **Scenario Explorer** gains code→scenario search (matches `covers` file paths) and shows covered paths per scenario.
  - **executable-stories-mcp:** New package. Read-only MCP tools over StoryReport v1 (`list_scenarios` with status/tag/source filters, `get_scenario`, `get_failing_scenarios`, `get_scenarios_for_paths`, `get_feature_summary`, `get_scenario_index`, `get_behavior_manifest`, `get_behavior_diff`) plus `run_scenario` (behind an extensible runner registry). Optional HTTP transport via `executable-stories-mcp/http`.
  - **executable-stories-{vitest,jest,playwright,cypress}:** New `covers` story option, beside `tags`/`tickets`, so code→scenario lookup works across frameworks. (Ruby, Go, Rust, pytest, JUnit5, and xUnit adapters gain the same `covers` field.)
  - **eslint plugins:** Documentation and metadata updates only.

### Patch Changes

- Updated dependencies [f790128]
  - executable-stories-formatters@0.10.0

## 8.1.18

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 8.1.17

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 8.1.16

### Patch Changes

- 6c87c1f: Multi-framework bootstrap and Cypress parity.
  - **executable-stories-cypress**: bring Cypress in line with Jest and Playwright. Adds top-level step exports (`given`, `when`, `then`, `and`, `but`), step modifiers (`.skip`, `.only`, `.todo`, `.fails`), scenario-level `story.skip` / `story.only`, `doc.story()` for attaching story metadata to plain Cypress tests, and a `traceUrlTemplate` option for linking failures to traces.
  - **executable-stories-init**: detect and scaffold Jest and Cypress alongside Vitest and Playwright. New `--jest`, `--cypress`, `--all`, and `--both` flags route through `resolveFrameworks()`; the wizard now prompts for all four frameworks. Plan generation batches dependency installs, handles script-name collisions when multiple frameworks coexist (e.g. `test:stories:vitest` + `test:stories:jest`), and emits framework-specific config and sample templates.
  - **executable-stories-formatters**: add `--fail-on-added-failures` and `--max-regressions` compare gates for CI regression budgets. Gate failures exit with code 5.

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15

## 8.1.15

### Patch Changes

- Updated dependencies [e8ae8c1]
  - executable-stories-formatters@0.7.14

## 8.1.14

### Patch Changes

- Updated dependencies [5273dbb]
  - executable-stories-formatters@0.7.13

## 8.1.13

### Patch Changes

- Updated dependencies [73c8fa6]
  - executable-stories-formatters@0.7.12

## 8.1.12

### Patch Changes

- Updated dependencies [4e99541]
  - executable-stories-formatters@0.7.11

## 8.1.11

### Patch Changes

- 4f84253: Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.
- Updated dependencies [4f84253]
  - executable-stories-formatters@0.7.10

## 8.1.10

### Patch Changes

- Updated dependencies [6778e30]
  - executable-stories-formatters@0.7.9

## 8.1.9

### Patch Changes

- Updated dependencies [e4953df]
  - executable-stories-formatters@0.7.8

## 8.1.8

### Patch Changes

- Updated dependencies [f64a4f2]
  - executable-stories-formatters@0.7.7

## 8.1.7

### Patch Changes

- Updated dependencies [650706c]
  - executable-stories-formatters@0.7.6

## 8.1.6

### Patch Changes

- Updated dependencies [0ec25fb]
  - executable-stories-formatters@0.7.5

## 8.1.5

### Patch Changes

- 63b9b70: Updated deps
- Updated dependencies [63b9b70]
  - executable-stories-formatters@0.7.4

## 8.1.4

### Patch Changes

- d1bd61d: Repository `.gitignore` now allows `packages/**/bin/intent.js` to be tracked while other `**/bin/` paths stay ignored.
- Updated dependencies [d1bd61d]
  - executable-stories-formatters@0.7.3

## 8.1.3

### Patch Changes

- ad335f4: fix: move executable-stories-formatters from peerDependencies to dependencies

  All JS adapters runtime-require executable-stories-formatters. Using workspace:\*
  in dependencies ensures pnpm resolves it locally during development and replaces
  it with the real version at publish time. Prevents changesets from bumping to
  unpublished versions.

## 8.1.2

### Patch Changes

- 046fd1a: fix: use createRequire for StoryReporter in vitest configs to avoid Vite bundling @cucumber/html-formatter CJS code
  - Move executable-stories-formatters from peerDependencies to dependencies in all JS adapters
  - Fix "Dynamic require of fs is not supported" in all vitest.config.ts files
  - Remove skipped tests documenting unsupported features in jest, vitest, and playwright examples

- Updated dependencies [046fd1a]
  - executable-stories-formatters@0.7.2

## 8.1.1

### Patch Changes

- cda1ba6: Added story groupings
- Updated dependencies [cda1ba6]
  - executable-stories-formatters@0.7.1

## 8.1.0

### Minor Changes

- 9c03b99: Add `story.attachSpans()` API to all framework adapters for attaching OTel spans to stories, enabling trace waterfall rendering in HTML reports. Fix Jest adapter span and attachment registries to key by scenario index instead of scenario name, preventing data overwrites when multiple stories share the same title.

## 8.0.0

### Patch Changes

- Updated dependencies [4a285ef]
  - executable-stories-formatters@0.7.0

## 7.0.2

### Patch Changes

- dcf42c1: Add lint and type-check configuration across ESLint plugins and framework packages; align build/test tooling and add skills and quality checks for non-JS packages (Go, JUnit5, pytest, Rust, xunit).
- Updated dependencies [dcf42c1]
  - executable-stories-formatters@0.6.2

## 7.0.1

### Patch Changes

- 43572f6: Updated tag html display
- Updated dependencies [43572f6]
  - executable-stories-formatters@0.6.1

## 7.0.0

### Minor Changes

- 1dc53b3: - **ESLint plugins (Jest, Playwright, Vitest):** Use `context.sourceCode` instead of deprecated `context.getSourceCode()` for ESLint 9 compatibility.
  - **Dependency updates** across packages and example apps.

### Patch Changes

- Updated dependencies [1dc53b3]
  - executable-stories-formatters@0.6.0

## 6.1.0

### Minor Changes

- 14ae91e: **Step callbacks and Auto-And (Jest, Vitest, Playwright, Cypress)**
  - **Step callbacks**: `story.given("text", () => value)` / `story.when("text", async () => value)` — optional callback runs after the step is recorded; return value is passed through; step gets `wrapped: true` and `durationMs`. Marker-only and inline-docs usage unchanged.
  - **Auto-And**: Repeated Given/When/Then in the same story render as "And" (first occurrence keeps Given/When/Then). Explicit `and()` / `but()` unchanged.
  - **Jest & Playwright**: Top-level exports `given`, `when`, `then`, `and`, `but` (framework contract).
  - **Playwright**: `story.init(fixtures, testInfo)` or `story.init(testInfo, { fixtures })` so step callbacks receive the test’s fixtures as first argument.

  **ESLint**
  - `no-restricted-syntax` (no dynamic `import()`) moved into `eslint-config-executable-stories` with an exception for `reporter.ts` and `__tests__/error-handling.test.ts`. Root config adds exceptions for `__tests__/story-api.test.ts` (and error-handling test) where needed.

## 6.0.0

### Patch Changes

- Updated dependencies [453d17d]
  - executable-stories-formatters@0.5.0

## 5.0.0

### Patch Changes

- Updated dependencies [68af01a]
  - executable-stories-formatters@0.4.0

## 4.0.0

### Minor Changes

- ab652d1: - **Repository metadata:** Add or fix repository metadata in each package for correct monorepo deployment (npm, changelog, docs links).
  - **OpenTelemetry:** Integrate OpenTelemetry support across adapter packages for trace links and observability.
  - **HTML report:** Step parameter highlighting — quoted strings and standalone numbers in step text are now visually highlighted in the HTML report for readability.
  - **Documentation:** Update READMEs and docs to describe HTML report features (step params, syntax highlighting, Mermaid, Markdown), fix formatters CLI flag docs (use `--html-no-*` disable flags; features are on by default), and add step parameter highlighting to the formatters API reference.

### Patch Changes

- Updated dependencies [ab652d1]
  - executable-stories-formatters@0.3.0

## 3.1.0

### Minor Changes

- 4df97de: Add or fix `repository.directory` in each package for correct monorepo metadata and deployment (npm, changelog, docs links).

## 3.0.0

### Patch Changes

- Updated dependencies [bc9b2fe]
  - executable-stories-formatters@0.2.0
