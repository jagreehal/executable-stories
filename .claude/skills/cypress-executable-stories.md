---
name: executable-stories-cypress
description: Write Given/When/Then story tests for Cypress with automatic Markdown doc generation. Use when creating BDD-style E2E tests or generating user story documentation from Cypress specs.
version: 2.0.0
libraries: ['cypress']
---

# executable-stories-cypress

BDD-style executable stories for Cypress. Uses Cypress’s native `describe`/`it`; story meta is sent from the browser to Node via `cy.task` and merged with run results for the reporter.

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

2. **Support file** — import so story meta is sent after each test (e.g. `cypress/support/e2e.ts`):

```ts
import "executable-stories-cypress/support";
```

## Usage

Call `story.init()` at the start of each test, then use step markers:

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

## Step markers

| Method              | Keyword | Purpose               |
| ------------------- | ------- | --------------------- |
| `story.given(text)` | Given   | Precondition/setup    |
| `story.when(text)`  | When    | Action                |
| `story.then(text)`  | Then    | Assertion             |
| `story.and(text)`   | And     | Continuation          |
| `story.but(text)`   | But     | Negative continuation |

Same doc methods as other adapters: `story.note()`, `story.kv()`, `story.json()`, `story.code()`, `story.table()`, `story.link()`, `story.section()`, `story.mermaid()`, `story.screenshot()`, `story.custom()`, `story.tag()`.

## Reporter

Output uses the **executable-stories-formatters** schema (RawRun). Use the Mocha reporter with `--reporter executable-stories-cypress/reporter` and `--reporter-options outputDir=...,outputName=...`, or the Module API: `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` from `executable-stories-cypress/reporter`.

## Best practices

- MUST call `story.init()` at the start of each test that should be documented
- SHOULD use `.story.cy.ts` suffix for story specs
- NEVER put assertions in `given` steps; NEVER put setup in `then` steps

## Project context

Repo conventions, ESLint plugins, and verification: see **AGENTS.md** (and **CLAUDE.md** symlink) in the repo root.
