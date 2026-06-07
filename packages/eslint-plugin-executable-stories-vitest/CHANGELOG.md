# eslint-plugin-executable-stories-vitest

## 2.1.9

### Patch Changes

- Republish of 2.1.7; no functional changes.

## 2.1.7

### Patch Changes

- f790128: Add agent-oriented artifacts, an MCP server, and cross-language code→behavior linking.
  - **executable-stories-formatters:** Two output formats — `scenario-index-json` (Storybook-like scenario index, schema v1) and `behavior-manifest-json` (source-file rollups, tag index, doc coverage, debugger warnings). New scenario field **`covers`** (product-code paths/globs) carried through the StoryReport contract, plus `scenariosCoveringPaths` (code→scenario) and `diffStoryReports` (behavior diff) helpers. The behavior manifest gains a `missing-covers` debugger warning; `executable-stories list --list-format json` now includes `covers`. New **`watch`** subcommand (and `startWatch`/`regenerateArtifacts` API) regenerates agent artifacts whenever the raw-run file changes — a live, language-agnostic behavior index. The scaffolded **Scenario Explorer** gains code→scenario search (matches `covers` file paths) and shows covered paths per scenario.
  - **executable-stories-mcp:** New package. Read-only MCP tools over StoryReport v1 (`list_scenarios` with status/tag/source filters, `get_scenario`, `get_failing_scenarios`, `get_scenarios_for_paths`, `get_feature_summary`, `get_scenario_index`, `get_behavior_manifest`, `get_behavior_diff`) plus `run_scenario` (behind an extensible runner registry). Optional HTTP transport via `executable-stories-mcp/http`.
  - **executable-stories-{vitest,jest,playwright,cypress}:** New `covers` story option, beside `tags`/`tickets`, so code→scenario lookup works across frameworks. (Ruby, Go, Rust, pytest, JUnit5, and xUnit adapters gain the same `covers` field.)
  - **eslint plugins:** Documentation and metadata updates only.

## 2.1.6

### Patch Changes

- 4f84253: Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.

## 2.1.5

### Patch Changes

- 63b9b70: Updated deps

## 2.1.4

### Patch Changes

- d1bd61d: Repository `.gitignore` now allows `packages/**/bin/intent.js` to be tracked while other `**/bin/` paths stay ignored.

## 2.1.3

### Patch Changes

- 046fd1a: fix: use createRequire for StoryReporter in vitest configs to avoid Vite bundling @cucumber/html-formatter CJS code
  - Move executable-stories-formatters from peerDependencies to dependencies in all JS adapters
  - Fix "Dynamic require of fs is not supported" in all vitest.config.ts files
  - Remove skipped tests documenting unsupported features in jest, vitest, and playwright examples

## 2.1.2

### Patch Changes

- dcf42c1: Add lint and type-check configuration across ESLint plugins and framework packages; align build/test tooling and add skills and quality checks for non-JS packages (Go, JUnit5, pytest, Rust, xunit).

## 2.1.1

### Patch Changes

- 43572f6: Updated tag html display

## 2.1.0

### Minor Changes

- 1dc53b3: - **ESLint plugins (Jest, Playwright, Vitest):** Use `context.sourceCode` instead of deprecated `context.getSourceCode()` for ESLint 9 compatibility.
  - **Dependency updates** across packages and example apps.

## 2.0.0

### Patch Changes

- Updated dependencies [14ae91e]
  - eslint-config-executable-stories@0.2.0

## 1.2.0

### Minor Changes

- ab652d1: - **Repository metadata:** Add or fix repository metadata in each package for correct monorepo deployment (npm, changelog, docs links).
  - **OpenTelemetry:** Integrate OpenTelemetry support across adapter packages for trace links and observability.
  - **HTML report:** Step parameter highlighting — quoted strings and standalone numbers in step text are now visually highlighted in the HTML report for readability.
  - **Documentation:** Update READMEs and docs to describe HTML report features (step params, syntax highlighting, Mermaid, Markdown), fix formatters CLI flag docs (use `--html-no-*` disable flags; features are on by default), and add step parameter highlighting to the formatters API reference.

## 1.1.0

### Minor Changes

- 4df97de: Add or fix `repository.directory` in each package for correct monorepo metadata and deployment (npm, changelog, docs links).

## 1.0.0

### Minor Changes

- bc9b2fe: ESLint config and plugins: minor updates for story-based API and conventions.

### Patch Changes

- Updated dependencies [bc9b2fe]
  - eslint-config-executable-stories@0.1.0
