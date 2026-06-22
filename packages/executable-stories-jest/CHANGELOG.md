# executable-stories-jest

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
