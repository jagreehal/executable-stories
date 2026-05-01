# executable-stories-formatters

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
