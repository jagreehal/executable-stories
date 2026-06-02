# executable-stories-vitest

## 8.3.2

### Patch Changes

- 8ed660b: attachSpans() now accepts optional `{ traceId, spanId }` for the capture-then-attach trace path. When a test wraps work in its own root span after init(), the trace badge and "View Trace" link can be wired via attachSpans. Also extracts applyTraceToMeta into a shared idempotent helper — once a traceId is recorded it is not overwritten, so the active-span path in init() and the explicit path in attachSpans() compose without duplicating entries.

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

## 8.1.20

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 8.1.19

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 8.1.18

### Patch Changes

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15

## 8.1.17

### Patch Changes

- 3c8a26f: Improve Vitest reporter interoperability with vitest-compatible runners by adding a typed `createStoryReporter()` factory and exporting structural reporter types (`StoryReporterProtocol`, `VitestContext`) for config-time usage without brittle type casts.

  This keeps runtime behavior unchanged while making reporter setup safer and easier in environments where nominal `Reporter` typing can fail across Vitest forks.

## 8.1.16

### Patch Changes

- 8c2456d: Improve Vitest reporter resilience and compatibility for vitest-compatible runners (including `vite-plus`):
  - fix coverage handling to accumulate data across multiple `onCoverage` callbacks instead of overwriting prior payloads
  - isolate `rawRunPath` write failures so report generation, history updates, and notifications still run
  - improve retry metadata mapping so `retries` is derived from available Vitest task metadata instead of always `0`
  - add regression tests for coverage accumulation, raw run write failure resilience, and retry metadata mapping

  Also adds a minimal `apps/vite-plus-example` workspace app to validate `vite-plus` config + StoryReporter usage, plus a root README update to better represent the project's multi-language package support.

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

- 4a285ef: - **formatters:** Add `--html-theme` with six built-in themes (default, corporate, terminal, minimal, dashboard, playful). Add run-diff formatters (HTML and Markdown) for comparing baseline vs current runs, plus `diffRuns`, `listScenarios`, and `selectTestCases` APIs. Add failure-summary renderer in HTML report.
  - **playwright, vitest, jest:** Align story API and reporter output with formatters (themes, run-diff, scenario listing).
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

### Minor Changes

- 453d17d: **executable-stories-formatters**
  - **CI detection**: Auto-detect CI environment (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) and attach branch, commit SHA, PR number, and build URL to reports.
  - **Notifications**: Slack and Microsoft Teams webhooks; generic webhook with optional HMAC-SHA256 signing. CLI flags `--slack-webhook`, `--teams-webhook`, `--notify` (always | on-failure | never), `--report-url`, `--webhook-url` / `--webhook-hmac-*`.
  - **History**: Optional run history via `--history-file` and `--max-history-runs`. Enables flakiness, stability grade, and performance trend metrics for the HTML report.
  - **HTML report**: CI meta block, history/stability/flakiness in scenario rendering, and updated styles.

  **executable-stories-playwright**
  - **OpenTelemetry**: Reporter can emit spans for story steps and scenarios when `autotel` is available (optional; lazy-loaded). Supports trace waterfall and framework-native observability.

  **executable-stories-vitest**
  - **Reporter**: Emit CI and run metadata so formatter CLI can attach CI info and history when generating reports.

### Patch Changes

- Updated dependencies [453d17d]
  - executable-stories-formatters@0.5.0

## 5.0.0

### Minor Changes

- 68af01a: Add trace view to HTML reports: scenarios can display an OpenTelemetry-style trace waterfall when span data is attached. Formatters gain a trace-view renderer and OTEL types; Playwright and Vitest reporters pass trace/span data into the report.

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
