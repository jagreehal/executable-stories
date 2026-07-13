# executable-stories-playwright

## 8.6.3

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

## 8.6.2

### Patch Changes

- Updated dependencies [af026d1]
  - executable-stories-formatters@1.2.0

## 8.6.1

### Patch Changes

- Updated dependencies [fe8cd62]
  - executable-stories-formatters@1.1.0

## 8.6.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [b905ea9]
  - executable-stories-formatters@1.0.1

## 8.5.7

### Patch Changes

- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
  - executable-stories-formatters@1.0.0

## 8.5.6

### Patch Changes

- Updated dependencies [99072d1]
  - executable-stories-formatters@0.17.0

## 8.5.5

### Patch Changes

- Updated dependencies [31cce46]
  - executable-stories-formatters@0.16.0

## 8.5.4

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

## 8.5.3

### Patch Changes

- Updated dependencies [424b22c]
  - executable-stories-formatters@0.15.0

## 8.5.2

### Patch Changes

- Updated dependencies [6374d1b]
  - executable-stories-formatters@0.14.0

## 8.5.1

### Patch Changes

- Updated dependencies [e75d26f]
  - executable-stories-formatters@0.13.0

## 8.5.0

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

## 8.4.5

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

## 8.4.2

### Patch Changes

- 8ed660b: attachSpans() now accepts optional `{ traceId, spanId }` for the capture-then-attach trace path. When a test wraps work in its own root span after init(), the trace badge and "View Trace" link can be wired via attachSpans. Also extracts applyTraceToMeta into a shared idempotent helper — once a traceId is recorded it is not overwritten, so the active-span path in init() and the explicit path in attachSpans() compose without duplicating entries.

## 8.4.1

### Patch Changes

- Updated dependencies [c6890c9]
  - executable-stories-formatters@0.11.1

## 8.4.0

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

## 8.3.0

### Minor Changes

- f790128: Add agent-oriented artifacts, an MCP server, and cross-language code→behavior linking.
  - **executable-stories-formatters:** Two output formats — `scenario-index-json` (Storybook-like scenario index, schema v1) and `behavior-manifest-json` (source-file rollups, tag index, doc coverage, debugger warnings). New scenario field **`covers`** (product-code paths/globs) carried through the StoryReport contract, plus `scenariosCoveringPaths` (code→scenario) and `diffStoryReports` (behavior diff) helpers. The behavior manifest gains a `missing-covers` debugger warning; `executable-stories list --list-format json` now includes `covers`. New **`watch`** subcommand (and `startWatch`/`regenerateArtifacts` API) regenerates agent artifacts whenever the raw-run file changes — a live, language-agnostic behavior index. The scaffolded **Scenario Explorer** gains code→scenario search (matches `covers` file paths) and shows covered paths per scenario.
  - **executable-stories-mcp:** New package. Read-only MCP tools over StoryReport v1 (`list_scenarios` with status/tag/source filters, `get_scenario`, `get_failing_scenarios`, `get_scenarios_for_paths`, `get_feature_summary`, `get_scenario_index`, `get_behavior_manifest`, `get_behavior_diff`) plus `run_scenario` (behind an extensible runner registry). Optional HTTP transport via `executable-stories-mcp/http`.
  - **executable-stories-{vitest,jest,playwright,cypress}:** New `covers` story option, beside `tags`/`tickets`, so code→scenario lookup works across frameworks. (Ruby, Go, Rust, pytest, JUnit5, and xUnit adapters gain the same `covers` field.)
  - **eslint plugins:** Documentation and metadata updates only.

### Patch Changes

- Updated dependencies [f790128]
  - executable-stories-formatters@0.10.0

## 8.2.14

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 8.2.13

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 8.2.12

### Patch Changes

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15

## 8.2.11

### Patch Changes

- e8ae8c1: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.
- Updated dependencies [e8ae8c1]
  - executable-stories-formatters@0.7.14

## 8.2.10

### Patch Changes

- 5273dbb: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.
- Updated dependencies [5273dbb]
  - executable-stories-formatters@0.7.13

## 8.2.9

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

- Updated dependencies [73c8fa6]
  - executable-stories-formatters@0.7.12

## 8.2.8

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

- Updated dependencies [4e99541]
  - executable-stories-formatters@0.7.11

## 8.2.7

### Patch Changes

- 4f84253: Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.
- Updated dependencies [4f84253]
  - executable-stories-formatters@0.7.10

## 8.2.6

### Patch Changes

- Updated dependencies [6778e30]
  - executable-stories-formatters@0.7.9

## 8.2.5

### Patch Changes

- Updated dependencies [e4953df]
  - executable-stories-formatters@0.7.8

## 8.2.4

### Patch Changes

- Updated dependencies [f64a4f2]
  - executable-stories-formatters@0.7.7

## 8.2.3

### Patch Changes

- Updated dependencies [650706c]
  - executable-stories-formatters@0.7.6

## 8.2.2

### Patch Changes

- Updated dependencies [0ec25fb]
  - executable-stories-formatters@0.7.5

## 8.2.1

### Patch Changes

- 63b9b70: Updated deps
- Updated dependencies [63b9b70]
  - executable-stories-formatters@0.7.4

## 8.2.0

### Minor Changes

- 2eedbbd: Add Playwright-native integrations for screencast chapters (v1.59), tracing groups (v1.49), and TestStepInfo injection (v1.51). Async and stepInfo-aware callbacks are now routed through a dedicated step runner that integrates with these APIs, with graceful degradation on older Playwright versions. Also adds story.console() for capturing page console messages and tag sync to Playwright annotations.

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
