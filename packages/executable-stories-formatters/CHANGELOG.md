# executable-stories-formatters

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
