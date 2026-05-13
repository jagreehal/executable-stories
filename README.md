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

If a test is skipped, failed, or todo, the docs reflect that.

## Packages

| Package                                                                   | Ecosystem                    | Install / Usage                          |
| ------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| [executable-stories-jest](./packages/executable-stories-jest)             | Jest 30+                     | `npm i -D executable-stories-jest`       |
| [executable-stories-vitest](./packages/executable-stories-vitest)         | Vitest 4+                    | `npm i -D executable-stories-vitest`     |
| [executable-stories-playwright](./packages/executable-stories-playwright) | Playwright 1.58+             | `npm i -D executable-stories-playwright` |
| [executable-stories-cypress](./packages/executable-stories-cypress)       | Cypress 13+                  | `npm i -D executable-stories-cypress`    |
| [executable-stories-ruby](./packages/executable-stories-ruby)             | Ruby / Minitest              | Ruby gem/package in repo                 |
| [executable-stories-go](./packages/executable-stories-go)                 | Go `testing`                 | Go module in repo                        |
| [executable-stories-rust](./packages/executable-stories-rust)             | Rust                          | Rust crate in repo                       |
| [executable-stories-pytest](./packages/executable-stories-pytest)         | Python / pytest              | Python package in repo                   |
| [executable-stories-junit5](./packages/executable-stories-junit5)         | Kotlin / JUnit 5             | JVM module in repo                       |
| [executable-stories-xunit](./packages/executable-stories-xunit)           | C# / xUnit                   | .NET package in repo                     |
| [executable-stories-formatters](./packages/executable-stories-formatters) | Cross-runner formatter CLI   | `npm i -D executable-stories-formatters` |
| [executable-stories-demo](./packages/executable-stories-demo)             | Demo site/report tooling     | workspace package                        |
| [eslint-plugin-executable-stories-vitest](./packages/eslint-plugin-executable-stories-vitest) | ESLint plugin (Vitest) | `npm i -D eslint-plugin-executable-stories-vitest` |
| [eslint-plugin-executable-stories-jest](./packages/eslint-plugin-executable-stories-jest) | ESLint plugin (Jest)   | `npm i -D eslint-plugin-executable-stories-jest` |
| [eslint-plugin-executable-stories-playwright](./packages/eslint-plugin-executable-stories-playwright) | ESLint plugin (Playwright) | `npm i -D eslint-plugin-executable-stories-playwright` |
| [eslint-config](./packages/eslint-config)                                 | Shared ESLint config         | workspace package                        |

Example apps: [apps/jest-example](./apps/jest-example), [apps/vitest-example](./apps/vitest-example), [apps/playwright-example](./apps/playwright-example), [apps/cypress-example](./apps/cypress-example), [apps/vite-plus-example](./apps/vite-plus-example), [apps/junit5-example](./apps/junit5-example) (Java 21, Maven; verification: `pnpm run verify:junit5`), [apps/pytest-example](./apps/pytest-example) (Python 3.12+, pytest; verification: `pnpm run verify:pytest`), [apps/go-example](./apps/go-example) (Go 1.22+; verification: `pnpm run verify:go`), [apps/rust-example](./apps/rust-example) (Rust 1.75+; verification: `pnpm run verify:rust`), [apps/xunit-example](./apps/xunit-example) (.NET 8, xUnit; verification: `pnpm run verify:xunit`).

### Features matrix

| Feature                           | Jest                                                                          | Vitest                                                       | Playwright                                           | Cypress                                              |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| **API**                           | Top-level `given` / `when` / `then`                                           | Callback `steps.given` / `steps.when` / `steps.then`         | Top-level `given` / `when` / `then`                  | Top-level `story.init()` + `given` / `when` / `then` |
| **Step modifiers**                | `.skip` `.only` `.todo` `.fails` `.concurrent`                                | `.skip` `.only` `.todo` `.fails` `.concurrent`               | `.skip` `.only` `.fixme` `.todo` `.fail` `.slow`     | `.skip` `.only` `.todo` `.fails` `.concurrent`       |
| **Scenario modifiers**            | `story.skip` `story.only`                                                     | `story.skip` `story.only`                                    | `story.skip` `story.only` `story.fixme` `story.slow` | `story.skip` `story.only`                            |
| **Output modes**                  | Colocated, aggregated, mixed                                                  | Colocated, aggregated, mixed                                 | Colocated, aggregated, mixed                         | Colocated, aggregated, mixed                         |
| **Rich step docs** (`doc` API)    | ✅ note, kv, code, table, link, section, mermaid, screenshot, runtime, custom | ✅ same                                                      | ✅ same                                              | ✅ same                                              |
| **Scenario options**              | `tags`, `meta`, `ticket`, `traceUrlTemplate`                                  | `tags`, `meta`, `ticket`, `traceUrlTemplate`                 | `tags`, `meta`, `ticket`, `traceUrlTemplate`         | `tags`, `meta`, `ticket`, `traceUrlTemplate`         |
| **OTel trace link**               | ✅ auto-detect via `@opentelemetry/api`                                       | ✅ same                                                      | ✅ same                                              | — (browser env)                                      |
| **OTel trace waterfall**          | —                                                                             | ✅ via [autotel](https://github.com/jagreehal/autotel) `task.meta.otelSpans` | ✅ via autotel `otel-spans` annotation               | —                                                    |
| **Attach story to plain it/test** | `doc.story("Title")` inside `test()`                                          | `doc.story("Title", task)` with `it(..., ({ task }) => ...)` | `doc.story("Title")` inside `test()`                 | `doc.story("Title")` inside `it()`                  |
| **Step callbacks**                | `story.given('text', () => ...)` on all steps                                 | ✅ same                                                      | ✅ same                                              | ✅ same                                              |
| **AAA aliases**                   | arrange/act/assert, setup/context, etc.                                       | arrange/act/assert, setup/context, etc.                      | arrange/act/assert, setup/context, etc.              | arrange/act/assert, setup/context, etc.              |
| **CLI collate**                   | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **CI detection (formatter CLI)**  | ✅ (report meta: branch, commit, build URL)                                  | ✅                                                           | ✅                                                   | ✅                                                   |
| **Notifications (formatter CLI)**| Slack, Teams, webhook; `--notify`                                            | same                                                         | same                                                | same                                                |
| **Run history (formatter CLI)**   | `--history-file` → flakiness, stability, perf in HTML                       | same                                                         | same                                                | same                                                |
| **GitHub Actions summary**        | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **Custom doc renderers**          | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |

For per-framework behaviour and guarantees (entry point, mental model, modifiers, framework-native attach), see: [Jest — Developer experience](./packages/executable-stories-jest/README.md#developer-experience), [Vitest — Developer experience](./packages/executable-stories-vitest/README.md#developer-experience), [Playwright — Developer experience](./packages/executable-stories-playwright/README.md#developer-experience), [Cypress](./packages/executable-stories-cypress/README.md).

Details and reporter options: see each package's README.

**OTel trace link** is also supported in the non-JS adapters: Go (`WithTraceUrlTemplate`), Python (`trace_url_template`), Kotlin/JUnit5 (`traceUrlTemplate` parameter or env var), Rust (`with_trace_url_template`, requires `otel` feature), and C#/xUnit (`Story.WithTraceUrlTemplate()` or env var). All adapters auto-detect an active span and inject trace ID docs bidirectionally. Set `OTEL_TRACE_URL_TEMPLATE` (with `{traceId}` placeholder) to generate clickable trace links in reports.

**Step timing** (`startTimer`/`endTimer`) is supported in all non-JS adapters: Go (`s.StartTimer()`/`s.EndTimer(token)`), Python (`story.start_timer()`/`story.end_timer(token)`), Kotlin/JUnit5 (`Story.startTimer()`/`Story.endTimer(token)`), Rust (`story.start_timer()`/`story.end_timer(token)`), and C#/xUnit (`Story.StartTimer()`/`Story.EndTimer(token)`). The JS adapters record step timing automatically via `story.fn()` / `story.expect()` wrappers and step callbacks.

## Quick example

**Jest or Playwright** (top-level steps):

```ts
import { expect } from '@jest/globals'; // or from "vitest" / "@playwright/test"
import { given, story, then, when } from 'executable-stories-jest'; // or executable-stories-playwright

story('User logs in', () => {
  given('user is on login page');
  when('user submits valid credentials');
  then('user sees the dashboard', () => {
    expect(true).toBe(true); // or real assertion
  });
});
```

**Cypress** (call `story.init()` at the start of each `it`, then use step markers; see [Cypress README](./packages/executable-stories-cypress/README.md)).

**Vitest** (steps on callback only; no top-level `then`):

```ts
import { story } from 'executable-stories-vitest';
import { expect } from 'vitest';

story('User logs in', (steps) => {
  steps.given('user is on login page');
  steps.when('user submits valid credentials');
  steps.then('user sees the dashboard', () => {
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

See each package's README for detailed setup instructions.

## Development

From the repo root: `pnpm quality` runs build, lint, type-check, and test for all packages.

For contributor and AI agent guidance (conventions, framework APIs, ESLint plugins, verification), see [AGENTS.md](./AGENTS.md). [CLAUDE.md](./CLAUDE.md) is a symlink to the same file. Example apps in `apps/` use the workspace packages. JUnit 5, pytest, Go, Rust, and xUnit example apps are not part of `pnpm quality`. When Java 21 and Maven are available (e.g. in the devcontainer), run `pnpm run verify:junit5` to run [junit5-example](./apps/junit5-example). When Python 3.12+ is available, run `pnpm run verify:pytest` to run [pytest-example](./apps/pytest-example). When Go 1.22+ is available, run `pnpm run verify:go` to run [go-example](./apps/go-example). When Rust is available, run `pnpm run verify:rust` to run [rust-example](./apps/rust-example). When .NET 8 is available, run `pnpm run verify:xunit` to run [xunit-example](./apps/xunit-example).

### Formatters standalone binary

The `executable-stories-formatters` package (CLI for generating reports from test results JSON) supports filtering by source file (`--include` / `--exclude`), **CI auto-detection** (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) so reports include branch, commit, and build links, **notifications** (Slack, Teams, or generic webhook with optional HMAC signing; `--notify always|on-failure|never`), and **run history** (`--history-file`) for flakiness, stability, and performance trends in the HTML report. See [formatters README](./packages/executable-stories-formatters/README.md#filtering-by-source-file). The HTML report highlights step parameters (quoted strings and numbers) for readability. The package can be built as a single standalone binary with [Bun](https://bun.sh):

```bash
cd packages/executable-stories-formatters && bun run compile
```

This produces an `executable-stories` binary in that package directory. CI builds the binary for the runner platform and uploads it as an artifact (`executable-stories-linux-x64`). The Release workflow builds multi-platform binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64) and uploads them as the `formatters-binaries` artifact.

## License

MIT
