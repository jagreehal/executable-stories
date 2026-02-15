# executable-stories-formatters

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
