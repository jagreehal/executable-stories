---
title: Developer experience
description: How executable-stories fits into each framework — entry point, mental model, and modifiers
---

We aim for a **seamless native experience** in each framework. You keep your existing `describe` / `it` (or `test.describe` / `test`); we add **`story.init()`** and **`story.given`** / **`story.when`** / **`story.then`** so the reporter can generate Markdown. Same lifecycle, same reporting; no extra runner or "world" object.

## Conventions

**File naming:** Use a consistent suffix for story test files so they are easy to find and can be matched by test config or globs: **`.story.test.ts`** (Vitest and Jest), **`.story.spec.ts`** (Playwright), **`.story.cy.ts`** (Cypress).

## Jest

- **Entry point:** Import `story` from `executable-stories-jest` and `expect` from `@jest/globals`. Use **native** `describe()` and `it()`. At the start of each test that should appear in the report, call **`story.init()`** (no arguments; Jest gets the test name from `expect.getState()`), then **`story.given`**, **`story.when`**, **`story.then`** (and **`story.and`**, **`story.but`**).
- **Mental model:** You are writing normal Jest tests with step labels. One test = one scenario; the scenario title in the report is the **it name**. Tests appear in Jest's reporter and respect `-t`, `--watch`, and other Jest options.
- **Modifiers:** Use Jest's own: `it.skip`, `it.only`, `it.todo`, etc. No custom step semantics.
- **Suite path in docs:** A `## Suite name` heading appears only when Jest's `currentTestName` contains `" > "` (e.g. "Describe title > test name"). With the default Jest setup this is often not the case, so docs are flat unless you configure test name formatting.
- **Reporter:** Add the Story reporter to `reporters` with options such as `formats`, `outputDir`, `outputName`, and `output: { mode: 'aggregated' }`. See [Jest reporter options](/reference/jest-config/). Also add `setupFilesAfterEnv: ['executable-stories-jest/setup']`.

**What we guarantee:** Your describe/it stay as-is; we only add the `story` object and the reporter. The only intentional difference is how we group scenarios in the generated Markdown (by file and test name).

## Vitest

- **Entry point:** Import `story` from `executable-stories-vitest`. Use **native** `describe()` and `it()`. At the start of each test, call **`story.init(task)`** (with **`task`** from `it('...', ({ task }) => { ... })`), then **`story.given`**, **`story.when`**, **`story.then`** (and **`story.and`**, **`story.but`**). Step functions exist only on the **`story`** object; there is no top-level `then` export (see "Why no top-level then?" below).
- **Mental model:** Same as Jest: one test = one scenario; the scenario title is the **it name**. Tests appear in Vitest's reporter and respect `-t`, `--watch`, and other Vitest options.
- **Modifiers:** Use Vitest's own: `it.skip`, `it.only`, `it.todo`, `it.fails`, etc.
- **Suite path in docs:** Comes from `task.suite` when tests run inside a `describe()` block.
- **Reporter:** Import from **`executable-stories-vitest/reporter`** (not the main package) so the config does not load the main package, which can cause "Vitest failed to access its internal state" when loaded inside the config file.

**Why no top-level `then`?** Tooling that uses `await import("...")` can treat the module namespace as a thenable if it has a `then` property, causing import-time side effects or broken imports. We therefore do not export a top-level `then`; use **`story.then`** inside your test.

**What we guarantee:** Native describe/it, standard modifiers on the test, and the same story API as Jest/Playwright. The only intentional difference is the required **`task`** argument for `story.init(task)`.

### Wallaby and Vitest 4

Wallaby's automatic config extraction can fail when custom reporter instances are in the config. Use a separate config file for Wallaby without the reporter:

**`wallaby.js`:**

```js
export default function () {
  return {
    autoDetect: true,
    testFramework: {
      configFile: './vitest.wallaby.config.ts',
    },
  };
}
```

**`vitest.wallaby.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default'],
  },
});
```

Your main `vitest.config.ts` keeps the `StoryReporter` for normal `vitest run`. Wallaby uses the minimal config and tests run without doc generation.

## Playwright

- **Entry point:** Import `story` from `executable-stories-playwright` and `test`, `expect` from `@playwright/test`. Use **native** `test.describe()` and `test()`. At the start of each test, call **`story.init(testInfo)`** (pass **`testInfo`** from the test callback: `test('...', async ({ page }, testInfo) => { ... })`), then **`story.given`**, **`story.when`**, **`story.then`**. Your test still receives fixtures (e.g. `{ page }`) for browser actions.
- **Mental model:** Same as Jest/Vitest: one test = one scenario; the scenario title is the **test name**. Fixtures (e.g. `page`, `context`, `browser`) work exactly as in any Playwright test.
- **Modifiers:** Playwright uses **`.fail`** (expected failure), not `.fails`. Use `test.skip`, `test.only`, `test.fixme`, `test.todo`, `test.fail`, `test.slow` on the test. We follow Playwright's naming.
- **Suite path in docs:** Comes from `test.describe()` nesting via Playwright's title path.
- **Hooks:** `test.beforeEach` and `test.afterEach` work as usual. Each scenario is one test, so beforeEach runs once per scenario.
- **Reporter:** Use the package path with options such as `formats`, `outputDir`, `outputName`, and `output: { mode: 'aggregated' }`. See [Playwright reporter options](/reference/playwright-config/).

**What we guarantee:** Native test.describe/test, Playwright modifiers and fixtures, and the same story API as Jest/Vitest. The only intentional difference is the **`testInfo`** argument for `story.init(testInfo)` and Playwright's modifier names (`.fail` vs `.fails`, plus `.fixme` and `.slow`).

## Cypress

- **Entry point:** Import `story` from `executable-stories-cypress`. Use **native** `describe()` and `it()`. At the start of each test, call **`story.init()`** (no arguments; same as Jest), then **`story.given`**, **`story.when`**, **`story.then`** (and **`story.and`**, **`story.but`**). Story metadata is collected in the browser and sent to Node via **`cy.task`** so the reporter can generate docs.
- **Mental model:** One test = one scenario; the scenario title in the report is the **it name**. You write normal Cypress tests with step labels. The plugin (in `cypress.config.ts`) and support file (e.g. `cypress/support/e2e.ts`) must be set up so meta is merged with run results.
- **Modifiers:** Use Cypress/Mocha's own: `it.skip`, `it.only`, etc.
- **Reporter:** Use the Mocha reporter (`--reporter executable-stories-cypress/reporter`) or the Module API: after `cypress.run()`, call `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` from `executable-stories-cypress/reporter`. Options match the formatters' `FormatterOptions`.

**What we guarantee:** Native describe/it, same story API as Jest (no task/testInfo). The only intentional difference is that story meta is sent from the browser to Node via `cy.task` for report generation.
