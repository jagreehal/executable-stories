# executable-stories-cypress

BDD-style executable stories for Cypress with documentation generation. Uses Cypress’s native `describe`/`it`; story meta is sent from the browser to Node via `cy.task` and merged with run results for the reporter.

## Install

```bash
npm i -D executable-stories-cypress
```

## Setup

1. **Plugin** — register the task in `cypress.config.ts`:

```ts
import { defineConfig } from "cypress";
import { registerExecutableStoriesPlugin } from "executable-stories-cypress/plugin";

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});
```

2. **Support file** — import the support file so story meta is sent after each test (e.g. in `cypress/support/e2e.ts`):

```ts
import "executable-stories-cypress/support";
```

3. **Reporter** (optional) — to generate Markdown/HTML from runs, use the reporter or build a RawRun and pass it to the formatters. See [Reporter options](#reporter-options) below.

## Usage

In a spec, call `story.init()` at the start of each test that should be documented, then use step markers:

```ts
import { story } from "executable-stories-cypress";

describe("Calculator", () => {
  it("adds two numbers", () => {
    story.init();

    story.given("two numbers 5 and 3");
    const a = 5, b = 3;

    story.when("I add them together");
    const result = a + b;

    story.then("the result is 8");
    expect(result).toBe(8);
  });
});
```

With options:

```ts
story.init({ tags: ["smoke"], ticket: "JIRA-123" });
```

## Reporter options

The package outputs to the **executable-stories-formatters** schema (RawRun). You can:

- Use the Mocha reporter (when Cypress invokes it) with `--reporter executable-stories-cypress/reporter` and `--reporter-options outputDir=...,outputName=...`.
- Or use the Module API: after `cypress.run()`, call `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` (see exports from `executable-stories-cypress/reporter`).

Options match the formatters’ `FormatterOptions` (e.g. `formats`, `outputDir`, `outputName`, `markdown`, `rawRunPath`).

## Exports

- **Main:** `story`, `getAndClearMeta`, types from `executable-stories-cypress`.
- **Support:** `executable-stories-cypress/support` (side-effect: registers `afterEach` + `cy.task`).
- **Plugin:** `registerExecutableStoriesPlugin` from `executable-stories-cypress/plugin`.
- **Reporter:** default reporter and `buildRawRunFromCypressResult`, `generateReportsFromRawRun` from `executable-stories-cypress/reporter`.
