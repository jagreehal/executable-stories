# executable-stories-formatters

## 0.15.1

### Patch Changes

- e3f8c5b: Harden the living-docs workflow and align adapter documentation with current APIs.
  - **`executable-stories-formatters`**: refuse `build-docs` when `--site-dir` is not a scaffolded Astro site (requires `astro.config.mjs`); share the same `isScaffoldedAstroSite` check with `init-astro --update`; ship `templates/` in the published package and restore `.gitignore` from the npm-safe `gitignore` template filename; clarify CLI help for the init-astro → test → build-docs flow and that `format --format astro` is a single-page primitive
  - **`executable-stories-jest`**: fix `setup` docs to reference `executable-stories-jest` reporter paths and modern `formats` / `outputDir` / `outputName` options
  - **`executable-stories-cypress`**: widen the Cypress peer dependency to `>=13.0.0`; document the `reporter.cjs` entry for Mocha reporter usage
  - **`executable-stories-playwright`**: clarify install instructions and that scenario modifiers should use Playwright's native `test.skip` / `test.only` / etc.
  - **`executable-stories-vitest`**: document the `covers` scenario option in the README
  - **`executable-stories-mcp`**: document the raw-run → StoryReport flow, MCP client registration snippet, and `get_deployment_status` / `get_environment_drift` tools

## 0.15.0

### Minor Changes

- 424b22c: Extend the Astro living-docs portal with stakeholder-safe commentary and clearer ownership of generated content.
  - add `executable-stories new scenario-note --scenario-id <id>` to scaffold per-scenario business context pages under `src/content/docs/notes/`
  - emit `public/stories/notes-index.json` from `build-docs` and surface matching Business context links in the Scenario Explorer and `/stories/` overview
  - render explicit unverified and stale states for hand-written pages via `verifiedBy`, `scenarioId`, and verification age warnings
  - ship the `init-astro` scaffold with a portal-oriented `.gitignore` that keeps generated `stories/` and `public/stories/*` output out of git by default while preserving human-authored docs

## 0.14.0

### Minor Changes

- 6374d1b: Extend the living-docs portal in `build-docs` with audience-aware navigation and baseline diff reporting.
  - **`--audience-split`** — partition story pages into `stories/engineer/` and `stories/stakeholder/` (opt-in; default layout is unchanged)
  - **`--baseline <story-report.json>`** — emit a what's-changed page (`stories/changes.md` + `public/stories/changes.json`) with added/removed/regressed/fixed/changed groups, and 🆕/✅/⚠️ badges on affected scenario pages
  - **Scenario deep-link index** — `public/stories/scenario-links.json` keyed by stable scenario id (`url`, `anchor`, `deepLink`, `audience`, `status`) for external tools and MCP
  - **Stories overview** — audience-first landing page at `/stories/` with pass/fail cards and deep links
  - **Markdown hooks** — `scenarioAnchor` and `scenarioBadge` options for in-page anchors and change markers

## 0.13.0

### Minor Changes

- e75d26f: Add agent-loop reporting primitives to `executable-stories-formatters`.

  This release adds the `check`, `goal`, and `triage` CLI commands for
  backpressure, definition-of-done, and failure worklist flows, plus a new
  `traceability-matrix` output format for requirement-first coverage reporting.
  It also fixes raw-run schema validation gaps so runs that include story
  `covers` metadata and step `stepId` fields validate correctly.

## 0.12.0

### Minor Changes

- 46c17b9: Add the `story.html({ path | url | content, title?, height? })` doc kind for embedding generated HTML (charts, single-file reports, and skill/agent output such as `teach` lessons or architecture reviews) directly in story reports. Exactly one of `path` / `url` / `content` is required.
  - **HTML report:** rendered inside an always-sandboxed `<iframe sandbox="allow-scripts">` (no `allow-same-origin`) with a title bar and an open-in-new-tab control. Embedded scripts run (Tailwind/Mermaid CDN charts work) but cannot reach the report DOM, cookies, or storage. Local files are inlined as `srcdoc` by default so the report stays self-contained; under `--asset-mode copy` they are copied as hashed assets. `height` accepts a number (px) or string (e.g. `"60vh"`), default 400px.
  - **Other formats degrade gracefully:** Markdown (link / collapsible code block), JUnit (text line), Cucumber JSON (`text/html` embedding), Confluence (link / code block).
  - **Adapters:** `story.html(...)` plus the inline `html` key on step docs across Vitest, Jest, Playwright, and Cypress. Playwright inlines local files at capture time so they survive per-test `outputDir` cleanup.
  - **Cross-language parity:** the Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters gain the same `html` doc kind (published via their own registries), each enforcing the exactly-one-source rule idiomatically.

  See the [Embedding skill & agent HTML output](https://github.com/jagreehal/executable-stories) guide for the sandbox-safe authoring contract and `content`-vs-`path` source guidance.

## 0.11.4

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

## 0.11.1

### Patch Changes

- c6890c9: Add release confidence workflows: gate-release CLI subcommand, deployment tracking (record/status/diff), ReleaseManifestFormatter, and new MCP tools for deployment status and environment drift.

## 0.11.0

### Minor Changes

- 00854ee: First-class video support and an expanded docs/agent toolchain.
  - **Adapters (Vitest, Jest, Playwright, Cypress):** add `story.video({ path, caption?, poster? })` doc kind and the `covers` story option (product-code paths/globs a scenario exercises). Playwright also auto-attaches its recorded run video.
  - **Formatters:** render the new `video` doc entry across HTML, Markdown, Confluence, and Astro outputs.
  - **Formatters CLI:** new `build-docs`, `check-links`, `watch`, `scaffold-doc`, and `import-openapi` commands.
  - **Formatters artifacts:** add the behavior-manifest JSON, scenario-index JSON, and coverage-index outputs alongside StoryReport v1.
  - **Astro template:** new Explorer page plus `HealthDashboard`, `VerifiedBy`, `VerifiedStep`, `ApiOperations`, `Checklist`, and `PageTitle` components, with verification/report-health helpers and global token styles.

## 0.10.0

### Minor Changes

- f790128: Add agent-oriented artifacts, an MCP server, and cross-language code→behavior linking.
  - **executable-stories-formatters:** Two output formats — `scenario-index-json` (Storybook-like scenario index, schema v1) and `behavior-manifest-json` (source-file rollups, tag index, doc coverage, debugger warnings). New scenario field **`covers`** (product-code paths/globs) carried through the StoryReport contract, plus `scenariosCoveringPaths` (code→scenario) and `diffStoryReports` (behavior diff) helpers. The behavior manifest gains a `missing-covers` debugger warning; `executable-stories list --list-format json` now includes `covers`. New **`watch`** subcommand (and `startWatch`/`regenerateArtifacts` API) regenerates agent artifacts whenever the raw-run file changes — a live, language-agnostic behavior index. The scaffolded **Scenario Explorer** gains code→scenario search (matches `covers` file paths) and shows covered paths per scenario.
  - **executable-stories-mcp:** New package. Read-only MCP tools over StoryReport v1 (`list_scenarios` with status/tag/source filters, `get_scenario`, `get_failing_scenarios`, `get_scenarios_for_paths`, `get_feature_summary`, `get_scenario_index`, `get_behavior_manifest`, `get_behavior_diff`) plus `run_scenario` (behind an extensible runner registry). Optional HTTP transport via `executable-stories-mcp/http`.
  - **executable-stories-{vitest,jest,playwright,cypress}:** New `covers` story option, beside `tags`/`tickets`, so code→scenario lookup works across frameworks. (Ruby, Go, Rust, pytest, JUnit5, and xUnit adapters gain the same `covers` field.)
  - **eslint plugins:** Documentation and metadata updates only.

## 0.9.0

### Minor Changes

- 203692c: Add Evidence-Driven Review — a report for reviewing AI-authored changes by behaviour and proof instead of by diff.
  - New `review` CLI subcommand: correlates a run against the PR diff (`--changed-files`, `--base-ref`) and bands changed code as 🔴 uncovered / 🟡 weak / 🟢 covered, with opt-in gates (`--fail-on`, `--min-evidence`).
  - `ReviewMarkdownFormatter` and `ReviewHtmlFormatter`: audience-segmented (stakeholder vs engineer, derived from file convention), evidence-graded claim cards with intent, tickets, and inline screenshots/OTEL.
  - New typed `evidence` field on `TestCaseResult` (mutation score, changed-line coverage, failing-first), ingested at the ACL layer — no adapter or story-API changes.
  - Fix: align `raw-run.schema.json` with what the official reporters emit (inline-body attachments, rich CI info) — previously a stale "MVP" shape that review-mode validation surfaced.

## 0.8.0

### Minor Changes

- 7f1f13d: HTML-first report improvements and Storybook coverage for every renderer.
  - Default output format is now `html` (was `cucumber-json`).
  - ✨ Copy-as-Claude-prompt button on failed scenarios — copies steps + error + source as a ready-to-paste prompt for AI investigation.
  - Persist collapse/expand state in localStorage so navigation across reloads keeps your context.
  - Mobile responsive refinements: header stacks, action buttons stay visible on touch, search input becomes full-width.
  - Storybook now covers every HTML renderer (doc-entries, scenario, steps, feature, error-box, failure-summary, tag-bar, toc, trace-view, meta, attachments, status, step-params), plus a `FullReport` composition and the `RunDiffHtml` formatter. Mermaid diagrams render live inside Storybook via the preview decorator.

## 0.7.15

### Patch Changes

- 6c87c1f: Multi-framework bootstrap and Cypress parity.
  - **executable-stories-cypress**: bring Cypress in line with Jest and Playwright. Adds top-level step exports (`given`, `when`, `then`, `and`, `but`), step modifiers (`.skip`, `.only`, `.todo`, `.fails`), scenario-level `story.skip` / `story.only`, `doc.story()` for attaching story metadata to plain Cypress tests, and a `traceUrlTemplate` option for linking failures to traces.
  - **executable-stories-init**: detect and scaffold Jest and Cypress alongside Vitest and Playwright. New `--jest`, `--cypress`, `--all`, and `--both` flags route through `resolveFrameworks()`; the wizard now prompts for all four frameworks. Plan generation batches dependency installs, handles script-name collisions when multiple frameworks coexist (e.g. `test:stories:vitest` + `test:stories:jest`), and emits framework-specific config and sample templates.
  - **executable-stories-formatters**: add `--fail-on-added-failures` and `--max-regressions` compare gates for CI regression budgets. Gate failures exit with code 5.

## 0.7.14

### Patch Changes

- e8ae8c1: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.

## 0.7.13

### Patch Changes

- 5273dbb: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.

## 0.7.12

### Patch Changes

- 73c8fa6: Fix broken screenshots, videos, and garbled error output in HTML reports
  generated on GitHub Actions and other CI runners.

  **Screenshots (`story.screenshot()`).** The path passed to `story.screenshot()`
  (typically `testInfo.outputPath(...)`) lives inside Playwright's per-test
  `test-results/` directory, which Playwright cleans up between runs. By the
  time the formatter (or a downstream artifact-only job) generated the HTML,
  those files were gone and reports shipped `<img src="/home/runner/work/...">`
  that 404'd against whatever host served the page. `story.screenshot()` now
  reads the file synchronously at the call site and inlines it as a `data:` URI,
  so the bytes are captured the moment they exist. Remote URLs and unreadable
  paths fall back to the original behavior.

  **Videos, traces, and auto-attachments.** Playwright videos and other
  path-based attachments hit the same cleanup race. The Playwright reporter now
  persists each path-based attachment at `onTestEnd`: files at or below
  `attachments.inlineMaxBytes` (default 1 MB) are base64-encoded into
  `raw-run.json`, larger files are copied to
  `<outputDir>/attachments/<test-id>/<filename>` and the path is rewritten to
  that stable location. Configurable via the new
  `StoryReporterOptions.attachments` field; pass `{ enabled: false }` for the
  previous behavior.

  **Error rendering.** Playwright supplies failure messages with embedded ANSI
  color codes (e.g. `\x1B[2mexpect(\x1B[22m...`). The reporter now strips ANSI
  from `error.message` and `error.stack` before they reach raw-run, and the HTML
  error-box renderer strips defensively as well so other adapters benefit.

  **Defensive HTML rendering.** When the formatter still cannot read a local
  absolute path at format time (POSIX `/foo` or Windows `C:\foo`), screenshots
  and attachments now render a "Screenshot/Attachment unavailable" placeholder
  showing the original path instead of emitting a broken `<img>`/`<video>` tag.
  Relative paths, remote URLs, and reports with `embedScreenshots: false` keep
  the legacy `<img>`/`<video>`/`<a>` output so users handling assets externally
  are unaffected.

## 0.7.11

### Patch Changes

- 4e99541: Fix 404s on screenshots when HTML reports are downloaded as CI artifacts.

  `story.screenshot({ path })` previously emitted the absolute on-runner path
  (e.g. `/home/runner/work/repo/test-results/foo.png`) directly as `<img src>`
  in the generated HTML. When the artifact was downloaded and opened locally,
  those paths no longer existed.

  The HTML formatter now inlines local screenshot files as `data:` URIs at
  render time when `embedScreenshots` is true (the default), making reports
  self-contained. Remote `http(s)`/`data:` URLs and missing files pass through
  unchanged. Disable per-report with `html: { embedScreenshots: false }`.

## 0.7.10

### Patch Changes

- 4f84253: Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.

## 0.7.9

### Patch Changes

- 6778e30: Added Confluence Formatters

## 0.7.8

### Patch Changes

- e4953df: Added CSV + markdown-table list output

## 0.7.7

### Patch Changes

- f64a4f2: Added astro

## 0.7.6

### Patch Changes

- 650706c: Changed default page to index.html

## 0.7.5

### Patch Changes

- 0ec25fb: Add HTML report navigation enhancements, theme switching support, and Storybook examples for formatter UI review.

## 0.7.4

### Patch Changes

- 63b9b70: Updated deps

## 0.7.3

### Patch Changes

- d1bd61d: Repository `.gitignore` now allows `packages/**/bin/intent.js` to be tracked while other `**/bin/` paths stay ignored.

## 0.7.2

### Patch Changes

- 046fd1a: fix: use createRequire for StoryReporter in vitest configs to avoid Vite bundling @cucumber/html-formatter CJS code
  - Move executable-stories-formatters from peerDependencies to dependencies in all JS adapters
  - Fix "Dynamic require of fs is not supported" in all vitest.config.ts files
  - Remove skipped tests documenting unsupported features in jest, vitest, and playwright examples

## 0.7.1

### Patch Changes

- cda1ba6: Added story groupings

## 0.7.0

### Minor Changes

- 4a285ef: - **formatters:** Add `--html-theme` with six built-in themes (default, corporate, terminal, minimal, dashboard, playful). Add run-diff formatters (HTML and Markdown) for comparing baseline vs current runs, plus `diffRuns`, `listScenarios`, and `selectTestCases` APIs. Add failure-summary renderer in HTML report.
  - **playwright, vitest, jest:** Align story API and reporter output with formatters (themes, run-diff, scenario listing).

## 0.6.2

### Patch Changes

- dcf42c1: Add lint and type-check configuration across ESLint plugins and framework packages; align build/test tooling and add skills and quality checks for non-JS packages (Go, JUnit5, pytest, Rust, xunit).

## 0.6.1

### Patch Changes

- 43572f6: Updated tag html display

## 0.6.0

### Minor Changes

- 1dc53b3: - **ESLint plugins (Jest, Playwright, Vitest):** Use `context.sourceCode` instead of deprecated `context.getSourceCode()` for ESLint 9 compatibility.
  - **Dependency updates** across packages and example apps.

## 0.5.0

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

## 0.4.0

### Minor Changes

- 68af01a: Add trace view to HTML reports: scenarios can display an OpenTelemetry-style trace waterfall when span data is attached. Formatters gain a trace-view renderer and OTEL types; Playwright and Vitest reporters pass trace/span data into the report.

## 0.3.0

### Minor Changes

- ab652d1: - **Repository metadata:** Add or fix repository metadata in each package for correct monorepo deployment (npm, changelog, docs links).
  - **OpenTelemetry:** Integrate OpenTelemetry support across adapter packages for trace links and observability.
  - **HTML report:** Step parameter highlighting — quoted strings and standalone numbers in step text are now visually highlighted in the HTML report for readability.
  - **Documentation:** Update READMEs and docs to describe HTML report features (step params, syntax highlighting, Mermaid, Markdown), fix formatters CLI flag docs (use `--html-no-*` disable flags; features are on by default), and add step parameter highlighting to the formatters API reference.

## 0.2.0

### Minor Changes

- bc9b2fe: ESLint config and plugins: minor updates for story-based API and conventions.
