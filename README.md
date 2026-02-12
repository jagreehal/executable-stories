# executable-stories

Executable stories without Cucumber in your framework of choice with automatic Markdown documentation.

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
- Reporter that generates Markdown from test metadata
- Output readable by developers and stakeholders

If a test is skipped, failed, or todo, the docs reflect that.

## Packages

| Package                                                                   | Test Runner      | Install                                  |
| ------------------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| [executable-stories-jest](./packages/executable-stories-jest)             | Jest 30+         | `npm i -D executable-stories-jest`       |
| [executable-stories-vitest](./packages/executable-stories-vitest)         | Vitest 4+        | `npm i -D executable-stories-vitest`     |
| [executable-stories-playwright](./packages/executable-stories-playwright) | Playwright 1.58+ | `npm i -D executable-stories-playwright` |
| [executable-stories-cypress](./packages/executable-stories-cypress)       | Cypress 13+      | `npm i -D executable-stories-cypress`    |

Example apps: [apps/jest-example](./apps/jest-example), [apps/vitest-example](./apps/vitest-example), [apps/playwright-example](./apps/playwright-example), [apps/cypress-example](./apps/cypress-example), [apps/junit5-example](./apps/junit5-example) (Java 21, Maven; verification: `pnpm run verify:junit5`), [apps/pytest-example](./apps/pytest-example) (Python 3.12+, pytest; verification: `pnpm run verify:pytest`), [apps/go-example](./apps/go-example) (Go 1.22+; verification: `pnpm run verify:go`), [apps/rust-example](./apps/rust-example) (Rust 1.75+; verification: `pnpm run verify:rust`), [apps/xunit-example](./apps/xunit-example) (.NET 8, xUnit; verification: `pnpm run verify:xunit`).

### Features matrix

| Feature                           | Jest                                                                          | Vitest                                                       | Playwright                                           | Cypress                                              |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| **API**                           | Top-level `given` / `when` / `then`                                           | Callback `steps.given` / `steps.when` / `steps.then`         | Top-level `given` / `when` / `then`                  | Top-level `story.init()` + `given` / `when` / `then` |
| **Step modifiers**                | `.skip` `.only` `.todo` `.fails` `.concurrent`                                | `.skip` `.only` `.todo` `.fails` `.concurrent`               | `.skip` `.only` `.fixme` `.todo` `.fail` `.slow`     | —                                                    |
| **Scenario modifiers**            | `story.skip` `story.only`                                                     | `story.skip` `story.only`                                    | `story.skip` `story.only` `story.fixme` `story.slow` | —                                                    |
| **Output modes**                  | Colocated, aggregated, mixed                                                  | Colocated, aggregated, mixed                                 | Colocated, aggregated, mixed                         | Colocated, aggregated, mixed                         |
| **Rich step docs** (`doc` API)    | ✅ note, kv, code, table, link, section, mermaid, screenshot, runtime, custom | ✅ same                                                      | ✅ same                                              | ✅ same                                              |
| **Scenario options**              | `tags`, `meta`, `ticket`, `traceUrlTemplate`                                  | `tags`, `meta`, `ticket`, `traceUrlTemplate`                 | `tags`, `meta`, `ticket`, `traceUrlTemplate`         | `tags`, `meta`, `ticket`                             |
| **OTel trace link**               | ✅ auto-detect via `@opentelemetry/api`                                       | ✅ same                                                      | ✅ same                                              | — (browser env)                                      |
| **Attach story to plain it/test** | `doc.story("Title")` inside `test()`                                          | `doc.story("Title", task)` with `it(..., ({ task }) => ...)` | `doc.story("Title")` inside `test()`                 | —                                                    |
| **AAA aliases**                   | arrange/act/assert, setup/context, etc.                                       | arrange/act/assert, setup/context, etc.                      | arrange/act/assert, setup/context, etc.              | arrange/act/assert, setup/context, etc.              |
| **CLI collate**                   | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **GitHub Actions summary**        | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |
| **Custom doc renderers**          | ✅                                                                            | ✅                                                           | ✅                                                   | ✅                                                   |

For per-framework behaviour and guarantees (entry point, mental model, modifiers, framework-native attach), see: [Jest — Developer experience](./packages/executable-stories-jest/README.md#developer-experience), [Vitest — Developer experience](./packages/executable-stories-vitest/README.md#developer-experience), [Playwright — Developer experience](./packages/executable-stories-playwright/README.md#developer-experience), [Cypress](./packages/executable-stories-cypress/README.md).

Details and reporter options: see each package's README.

**OTel trace link** is also supported in the non-JS adapters: Go (`WithTraceUrlTemplate`), Python (`trace_url_template`), Kotlin/JUnit5 (env var), Rust (`with_trace_url_template`, requires `otel` feature), and C#/xUnit (via built-in `System.Diagnostics.Activity`). All adapters auto-detect an active span and inject trace ID docs bidirectionally. Set `OTEL_TRACE_URL_TEMPLATE` (with `{traceId}` placeholder) to generate clickable trace links in reports.

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

The `executable-stories-formatters` package (CLI for generating reports from test results JSON) supports filtering by source file: use `--include` and `--exclude` glob patterns to limit which test cases appear in reports (see [formatters README](./packages/executable-stories-formatters/README.md#filtering-by-source-file)). The HTML report highlights step parameters (quoted strings and numbers) for readability. The package can be built as a single standalone binary with [Bun](https://bun.sh):

```bash
cd packages/executable-stories-formatters && bun run compile
```

This produces an `executable-stories` binary in that package directory. CI builds the binary for the runner platform and uploads it as an artifact (`executable-stories-linux-x64`). The Release workflow builds multi-platform binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64) and uploads them as the `formatters-binaries` artifact.

## License

MIT
