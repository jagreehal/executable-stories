# executable-stories

Executable stories without Cucumber across JavaScript/TypeScript and non-JS test frameworks, with generated documentation and report outputs.

## Why not Cucumber?

| This project                  | Cucumber                        |
| ----------------------------- | ------------------------------- |
| Write TypeScript              | Write Gherkin feature files     |
| Steps are inline functions    | Steps matched by regex          |
| Normal variables and closures | World object and shared state   |
| Docs generated from test runs | Separate documentation pipeline |

One source of truth. Code that executes. Docs that do not lie.

## What you get

- Scenario API built on your test runner's native primitives
- `given()`, `when()`, `then()`, `and()`, `but()` helpers that register real tests
- Reporters/formatters that generate Markdown, HTML, JUnit XML, and Cucumber outputs from test metadata
- Output readable by developers and stakeholders
- `coverage` and `sync` for TestRail and Xray: see what your tests already cover, then push cases, executions, and evidence from the same run ([guide](apps/docs-site/src/content/docs/guides/test-management-sync.md))

If a test is skipped, failed, or todo, the docs reflect that.

## Packages

| Package                                                                   | Ecosystem                    | Install / Usage                          |
| ------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| [executable-stories-jest](./packages/executable-stories-jest)             | Jest 30+                     | `npm i -D executable-stories-jest`       |
| [executable-stories-vitest](./packages/executable-stories-vitest)         | Vitest 4 or 5                | `npm i -D executable-stories-vitest`     |
| [executable-stories-playwright](./packages/executable-stories-playwright) | Playwright 1.58+             | `npm i -D executable-stories-playwright` |
| [executable-stories-cypress](./packages/executable-stories-cypress)       | Cypress 13+                  | `npm i -D executable-stories-cypress`    |
| [executable-stories-ruby](./packages/executable-stories-ruby)             | Ruby / Minitest              | Ruby gem/package in repo                 |
| [executable-stories-go](./packages/executable-stories-go)                 | Go `testing`                 | Go module in repo                        |
| [executable-stories-rust](./packages/executable-stories-rust)             | Rust                          | Rust crate in repo                       |
| [executable-stories-pytest](./packages/executable-stories-pytest)         | Python / pytest              | Python package in repo                   |
| [executable-stories-junit5](./packages/executable-stories-junit5)         | Kotlin / JUnit 5             | JVM module in repo                       |
| [executable-stories-xunit](./packages/executable-stories-xunit)           | C# / xUnit                   | .NET package in repo                     |
| [executable-stories-formatters](./packages/executable-stories-formatters) | Cross-runner formatter CLI   | `npm i -D executable-stories-formatters` |
| [executable-stories-react](./packages/executable-stories-react)           | React StoryReport renderer   | `npm i executable-stories-react`         |
| [executable-stories-mcp](./packages/executable-stories-mcp)               | Read-only MCP behavior tools | `npm i -D executable-stories-mcp`        |
| [executable-stories-init](./packages/executable-stories-init)             | JS/TS onboarding CLI         | `npm i -D executable-stories-init`       |
| [executable-stories-demo](./packages/executable-stories-demo)             | Demo site/report tooling     | workspace package                        |
| [eslint-plugin-executable-stories-vitest](./packages/eslint-plugin-executable-stories-vitest) | ESLint plugin (Vitest) | `npm i -D eslint-plugin-executable-stories-vitest` |
| [eslint-plugin-executable-stories-jest](./packages/eslint-plugin-executable-stories-jest) | ESLint plugin (Jest)   | `npm i -D eslint-plugin-executable-stories-jest` |
| [eslint-plugin-executable-stories-playwright](./packages/eslint-plugin-executable-stories-playwright) | ESLint plugin (Playwright) | `npm i -D eslint-plugin-executable-stories-playwright` |
| [eslint-config](./packages/eslint-config)                                 | Shared ESLint config         | workspace package                        |

Example apps: [apps/jest-example](./apps/jest-example), [apps/vitest-example](./apps/vitest-example), [apps/playwright-example](./apps/playwright-example), [apps/cypress-example](./apps/cypress-example), [apps/vite-plus-example](./apps/vite-plus-example), [apps/junit5-example](./apps/junit5-example) (Java 21, Gradle wrapper; verification: `pnpm run verify:junit5`), [apps/pytest-example](./apps/pytest-example) (Python 3.12+, pytest; verification: `pnpm run verify:pytest`), [apps/go-example](./apps/go-example) (Go 1.22+; verification: `pnpm run verify:go`), [apps/rust-example](./apps/rust-example) (Rust 1.75+; verification: `pnpm run verify:rust`), [apps/xunit-example](./apps/xunit-example) (.NET 10, xUnit v3; verification: `pnpm run verify:xunit`).

### Features matrix

The matrix below covers the JS/TS adapters. The same story structure and doc model
are mirrored across the Go, Ruby, Rust, pytest, JUnit 5 (Kotlin), and xUnit (C#)
adapters — see the [cross-language parity policy](https://executablestories.com/reference/cross-language-parity/).

| Feature                           | Jest                                                                          | Vitest                                                       | Playwright                                           | Cypress                                              |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| **API**                           | `story.init()` + `story.given` / `story.when` / `story.then`; top-level step helpers also exported | `story.init(task)` + `story.given` / `story.when` / `story.then`; no top-level `then` export | `story.init(testInfo)` + `story.given` / `story.when` / `story.then`; top-level step helpers also exported | `story.init()` + `story.given` / `story.when` / `story.then`; top-level step helpers also exported |
| **Step modifiers**                | `.skip` `.only` `.todo` `.fails` `.concurrent`                                | `.skip` `.only` `.todo` `.fails` `.concurrent`               | `.skip` `.only` `.fixme` `.todo` `.fail` `.slow`     | `.skip` `.only` `.todo` `.fails` `.concurrent`       |
| **Scenario modifiers**            | `story.skip` `story.only`                                                     | `story.skip` `story.only`                                    | `story.skip` `story.only` `story.fixme` `story.slow` | `story.skip` `story.only`                            |
| **Planned scenarios**             | ✅ bodyless `it.todo` in story files renders as _Planned_                     | ✅ same                                                      | ✅ `test.fixme('title')` in story specs               | ✅ bodyless `it('title')` (Mocha reporter path)       |
| **Output modes**                  | Colocated, aggregated, mixed                                                  | Colocated, aggregated, mixed                                 | Colocated, aggregated, mixed                         | Colocated, aggregated, mixed                         |
| **Rich step docs**                | ✅ note, kv, code, table, link, section, mermaid, screenshot, video, state, runtime, custom | ✅ same                                                      | ✅ same                                              | ✅ same                                              |
| **State snapshots** (`story.state`) | ✅ `story.state({ label?, value })` — data snapshot per step; same-label snapshots diffed in reports | ✅ same                                              | ✅ same                                              | ✅ same                                              |
| **Embedded HTML** (`story.html`)  | ✅ path / url / content → sandboxed iframe                                     | ✅ path / url / content → sandboxed iframe                   | ✅ same (local files inlined at capture time)        | ✅ path / url / content → sandboxed iframe            |
| **Feature declaration** (`story.feature`) | ✅ `story.feature({ title, kind, narrative, glossary })` at module scope | ✅ same | ✅ same | ✅ same |
| **Scenario options**              | `tags`, `meta`, `ticket`, `traceUrlTemplate`                                  | `tags`, `meta`, `ticket`, `traceUrlTemplate`                 | `tags`, `meta`, `ticket`, `traceUrlTemplate`         | `tags`, `meta`, `ticket`, `traceUrlTemplate`         |
| **OTel trace link**               | ✅ auto-detect via `@opentelemetry/api`                                       | ✅ same                                                      | ✅ same                                              | — (browser env)                                      |
| **OTel trace waterfall**          | —                                                                             | ✅ via [autotel](https://github.com/jagreehal/autotel) `task.meta.otelSpans` | ✅ via autotel `otel-spans` annotation               | —                                                    |
| **Attach story to plain it/test** | `story.init()` inside `test()`                                                | `story.init(task)` with `it(..., ({ task }) => ...)`         | `story.init(testInfo)` inside `test()`               | `story.init()` or `doc.story("Title")` inside `it()` |
| **Step callbacks**                | `story.given('text', () => ...)` on all steps                                 | ✅ same                                                      | ✅ same                                              | ✅ same                                              |
| **Assertions per step**           | ✅ observed — live `expect` counter, both step styles                          | ✅ same                                                       | ✅ same                                              | ⚠️ declared — wrapped claims only (`story.expect`); its assertions are queued commands, so there is no per-step counter to read |
| **AAA aliases**                   | arrange/act/assert, setup/context, etc.                                       | arrange/act/assert, setup/context, etc.                      | arrange/act/assert, setup/context, etc.              | arrange/act/assert, setup/context, etc.              |
| **CLI collate**                   | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **CI detection (formatter CLI)**  | ✅ (report meta: branch, commit, build URL)                                  | ✅                                                           | ✅                                                   | ✅                                                   |
| **Notifications (formatter CLI)**| Slack, Teams, webhook; `--notify`                                            | same                                                         | same                                                | same                                                |
| **Run history (formatter CLI)**   | `--history-file` → per-scenario timeline, Flaky badges, "Since last run" strip in HTML; stability + perf trends | same                                | same                                                | same                                                |
| **GitHub Actions summary**        | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **Custom doc renderers**          | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |

For per-framework behaviour and guarantees (entry point, mental model, modifiers, framework-native attach), see: [Jest — Developer experience](./packages/executable-stories-jest/README.md#developer-experience), [Vitest — Developer experience](./packages/executable-stories-vitest/README.md#developer-experience), [Playwright — Developer experience](./packages/executable-stories-playwright/README.md#developer-experience), [Cypress](./packages/executable-stories-cypress/README.md).

Details and reporter options: see each package's README.

**OTel trace link** is also supported in the non-JS adapters: Go (`WithTraceUrlTemplate`), Python (`trace_url_template`), Kotlin/JUnit5 (`traceUrlTemplate` parameter or env var), Rust (`with_trace_url_template`, requires `otel` feature), and C#/xUnit (`Story.WithTraceUrlTemplate()` or env var). All adapters auto-detect an active span and inject trace ID docs bidirectionally. Set `OTEL_TRACE_URL_TEMPLATE` (with `{traceId}` placeholder) to generate clickable trace links in reports.

**State snapshots** (`story.state({ label?, value })`) are supported in all adapters. A state doc captures what the world looks like at a step as a JSON-serializable value (e.g. the Basket after adding an item). Steps carrying a screenshot or state docs become storyboard frames: a label's first appearance shows the full snapshot, consecutive snapshots with the same label render as a diff (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Non-JS adapters mirror the verb with their local conventions, e.g. Go `s.State(label, value)`, Python `story.state(value, label=None)`, C# `Story.State(value, label)`. There is no size cap, but the JS adapters warn above ~100KB — capture the business-relevant projection, not the ORM entity.

**Assertions per step** records how many assertions each step made, so the report can tell a claim that was checked from one that only reads as though it was. Jest, Vitest, Playwright and Ruby/Minitest **observe** it from the framework's own live assertion counter, with no change to how you write tests. Cypress `story.expect`, Go `s.Expect`, Rust `expect_step`, pytest `story.expect`, JUnit 5 `Story.expect`, and xUnit `Story.Expect` **declare** one assertion because those hosts expose no counter. Where nothing can be observed the field is omitted entirely: absent means "cannot observe", which is deliberately not the same as `0`. A scenario whose observable claim steps ran and asserted nothing grades as `none` in Evidence Review, is marked in Markdown and HTML, and is counted in the CLI summary.

**Step timing** (`startTimer`/`endTimer`) is supported in all non-JS adapters: Go (`s.StartTimer()`/`s.EndTimer(token)`), Python (`story.start_timer()`/`story.end_timer(token)`), Kotlin/JUnit5 (`Story.startTimer()`/`Story.endTimer(token)`), Rust (`story.start_timer()`/`story.end_timer(token)`), and C#/xUnit (`Story.StartTimer()`/`Story.EndTimer(token)`). The JS adapters record step timing automatically via `story.fn()` / `story.expect()` wrappers and step callbacks.

## Quick example

**Jest** (`story.init()` plus step markers):

```ts
import { expect, it } from '@jest/globals';
import { story } from 'executable-stories-jest';

it('User logs in', () => {
  story.init();
  story.given('user is on login page');
  story.when('user submits valid credentials');
  story.then('user sees the dashboard', () => {
    expect(true).toBe(true); // or real assertion
  });
});
```

Playwright uses the same `story.given` / `story.when` / `story.then` style, but pass `testInfo` to `story.init(testInfo)`.

**Cypress** (call `story.init()` at the start of each `it`, then use step markers; see [Cypress README](./packages/executable-stories-cypress/README.md)).

**Vitest** (`story.init(task)`; no top-level `then`):

```ts
import { expect, it } from 'vitest';
import { story } from 'executable-stories-vitest';

it('User logs in', ({ task }) => {
  story.init(task);
  story.given('user is on login page');
  story.when('user submits valid credentials');
  story.then('user sees the dashboard', () => {
    expect(true).toBe(true);
  });
});
```

Playwright step callbacks can use fixtures: `given("...", async ({ page }) => { await page.goto("/login"); });`

**Generated Markdown:**

```markdown
### User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```

## Getting started

1. Install the package for your test runner
2. Add the reporter to your config
3. Run your tests
4. Open the generated Markdown

The reporter can write `reports/raw-run.json` as the current execution event. Formatting it updates one canonical report per test source under `reports/by-file/`; documentation formats render the accumulated suite while JUnit, Cucumber, and release manifests describe only that execution:

```bash
npx --package executable-stories-formatters executable-stories format reports/raw-run.json --format html,markdown
```

See each package's README for detailed setup instructions.

**Agent workflows:** Publish StoryReport JSON and a scenario index from CI — see the [agent artifact contract](https://executablestories.com/guides/agent-artifact-contract/) and [MCP server guide](https://executablestories.com/guides/mcp-server/). Package roles: [package map](https://executablestories.com/reference/package-map/). Cross-language parity policy: [parity matrix](https://executablestories.com/reference/cross-language-parity/).

## Living documentation site

Render your stories as a live Astro site: a grouped index, one page per
scenario, a searchable Explorer, persona views, ordered journeys, a UI-state
catalog, and multi-source drift. The `executable-stories-astro` integration
loads test run JSON as a hot-reloading `stories` collection: add a story test
and re-run, its page appears; delete it and the page is pruned. Step screenshots
and `story.state()` snapshots become storyboards (data diffs for non-UI code),
and existing design links appear next to the proof. Zero
per-test wiring or generated Markdown pages.

The `executable-stories` CLI ships in the `executable-stories-formatters` package
(install it, or invoke via `npx --package executable-stories-formatters executable-stories …`).

```bash
npx --package executable-stories-formatters executable-stories init-astro site   # scaffold the thin Astro/Starlight site
# vitest.config: createStoryReporter({ rawRunPath: 'reports/raw-run.json' })
cd site && npm install
pnpm test            # (in your project) writes reports/raw-run.json — auto-includes all stories
npm run dev          # live docs at /stories, hot-reloading as tests re-run; npm run build for static dist/
```

Configure audience lenses with `views`; compose walkthroughs with
`journey:<id>:<n>` tags; feed `/states` with `state:<name>` and
`viewport:<name>` tags. With two or more named `sources`, `/drift` compares
their current scenario status. Point `historyFile` at the CLI's
`--history-file` store to add recent-run stability to journey pages.

For a multi-repository hub, use the GitHub Action's `publish-run` mode in each
product repository, fetch the stable run URLs, and build one Astro site. See
the [Astro site guide](https://executablestories.com/guides/astro-docs-site/),
[audience tagging guide](https://executablestories.com/guides/tagging-for-your-audience/),
and [multi-repo hub guide](https://executablestories.com/guides/multi-repo-docs-hub/).

> **Removed:** the old `build-docs` command (a one-shot Markdown generator that
> wrote story pages into a scaffold) has been removed — stories now render live
> from the run JSON via the `executable-stories-astro` integration, with no
> Markdown-generation step. Use `init-astro` + `astro dev`. The
> `format --format astro-markdown` output (a single aggregated Markdown page)
> still exists for one-off exports but is not the recommended path for a site.

## Development

From the repo root: `pnpm quality` runs build, lint, type-check, and test for all packages.

For contributor and AI agent guidance (conventions, framework APIs, ESLint plugins, verification), see [AGENTS.md](./AGENTS.md). [CLAUDE.md](./CLAUDE.md) is a symlink to the same file. Example apps in `apps/` use the workspace packages. JUnit 5, pytest, Go, Rust, Ruby, and xUnit example apps are not part of `pnpm quality`. When Java 21 is available (e.g. in the devcontainer), run `pnpm run verify:junit5` to run [junit5-example](./apps/junit5-example). When Python 3.12+ is available, run `pnpm run verify:pytest` to run [pytest-example](./apps/pytest-example). When Go 1.22+ is available, run `pnpm run verify:go` to run [go-example](./apps/go-example). When Rust is available, run `pnpm run verify:rust` to run [rust-example](./apps/rust-example). When Ruby and Bundler are available, run `pnpm run verify:ruby` for [executable-stories-ruby](./packages/executable-stories-ruby). When the .NET 10 SDK is available, run `pnpm run verify:xunit` to run [xunit-example](./apps/xunit-example).

### Formatters standalone binary

The `executable-stories-formatters` package (CLI for generating reports from test results JSON) supports filtering by source file (`--include` / `--exclude`), **CI auto-detection** (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) so reports include branch, commit, and build links, **notifications** (Slack, Teams, or generic webhook with optional HMAC signing; `--notify always|on-failure|never`), and **run history** (`--history-file`) for flakiness, stability, and performance trends in the HTML report. See [formatters README](./packages/executable-stories-formatters/README.md#filtering-by-source-file). The HTML report highlights step parameters (quoted strings and numbers) for readability. The package can be built as a single standalone binary with [Bun](https://bun.sh):

```bash
cd packages/executable-stories-formatters && bun run compile
```

This produces an `executable-stories` binary in that package directory. CI builds the binary for the runner platform and uploads it as an artifact (`executable-stories-linux-x64`). The Release workflow builds multi-platform binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64) and uploads them as the `formatters-binaries` artifact.

## License

[Apache-2.0](./LICENSE). The Apache-2.0 licence applies to the source code. The Executable Stories name and logo are trademarks and are not granted for use by the software licence — see [TRADEMARKS.md](./TRADEMARKS.md).

Versions published before the licence change remain available under their original MIT licence.
