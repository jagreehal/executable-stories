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

Scenario-level helpers are also available:

```ts
story.skip("legacy scenario", () => {
  story.given("legacy behavior");
});

story.only("focused scenario", () => {
  story.given("focused behavior");
});
```

Framework-native attach to plain Cypress tests:

```ts
import { doc, story } from "executable-stories-cypress";

it("plain test name", () => {
  doc.story("Friendly scenario title");
  story.given("documented setup");
});
```

Step markers support metadata modifiers for report intent:

```ts
story.given.skip("legacy precondition");
story.when.concurrent("action can run in parallel");
story.then.todo("assertion to implement");
```

With options:

```ts
story.init({
  tags: ["smoke"],
  ticket: "JIRA-123",
  traceUrlTemplate: "https://grafana.example.com/explore?traceId={traceId}",
});
```

When `traceUrlTemplate` is set and spans are attached via `story.attachSpans(...)`, the story docs include a `Trace ID` entry and a `View Trace` link.

## Reporter options

The package outputs to the **executable-stories-formatters** schema (RawRun). You can:

- Use the Mocha reporter (when Cypress invokes it) with `--reporter executable-stories-cypress/reporter.cjs` and `--reporter-options outputDir=...,outputName=...`.
- Or use the Module API: after `cypress.run()`, call `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` (see exports from `executable-stories-cypress/reporter`).

Options match the formatters’ `FormatterOptions` (e.g. `formats`, `outputDir`, `outputName`, `markdown`, `rawRunPath`). Every formatted run updates one canonical report per test source under `<outputDir>/by-file/`; documentation formats render that accumulated state, while JUnit, Cucumber, and release manifests contain only the execution in hand.

Cypress cannot observe `@cypress/grep` title filtering. Pass `runScope: "filtered"`
to the reporter/module API for a narrowed run, or `runScope: "full"` only when the run
covered every scenario in its source files. Leaving it absent preserves earlier scenarios
and warns rather than deleting on a guess.

Cypress also exposes no live assertion counter. `story.expect("claim", callback)` declares
one assertion for that claim step; a normal `story.then()` followed by queued `.should()`
commands remains unobserved rather than being recorded as zero.

## Exports

- **Main:** `story`, `doc`, `getAndClearMeta`, types from `executable-stories-cypress`.
- **Support:** `executable-stories-cypress/support` (side-effect: registers `afterEach` + `cy.task`).
- **Plugin:** `registerExecutableStoriesPlugin` from `executable-stories-cypress/plugin`.
- **Reporter:** default reporter and `buildRawRunFromCypressResult`, `generateReportsFromRawRun` from `executable-stories-cypress/reporter`.
