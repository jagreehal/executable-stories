---
name: executable-stories-cypress
description: Write Given/When/Then story tests for Cypress with structured report generation. Use when creating BDD-style E2E tests or generating user story documentation from Cypress specs.
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
story.init({ tags: ["smoke"], ticket: "JIRA-123" }); // ticket also accepts { id: 'JIRA-123', url: '...' }
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

## Nested Doc Children

Doc entries can be nested under a parent entry. If a child was previously attached to an earlier story-level or step-level container, nesting it later reparents it under the parent so it does not appear twice.

```ts
it("documents grouped evidence", () => {
  story.init();

  story.given("the first step");
  const child = story.note("shared child");

  story.when("the second step");
  story.note("parent note", [child]);
});
```

Step markers also accept `DocEntry[]` as the second argument:

```ts
it("documents step attachments", () => {
  story.init();

  const child1 = story.kv({ label: "User", value: "alice" });
  const child2 = story.note("note about user");

  story.given("a user exists", [child1, child2]);
});
```

## Reporter

Output uses the **executable-stories-formatters** schema (RawRun). Use the Mocha reporter with `--reporter executable-stories-cypress/reporter` and `--reporter-options outputDir=...,outputName=...`, or the Module API: `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` from `executable-stories-cypress/reporter`.

## Best practices

- MUST call `story.init()` at the start of each test that should be documented
- SHOULD use `.story.cy.ts` suffix for story specs
- NEVER put assertions in `given` steps; NEVER put setup in `then` steps

## Formatting (when writing or citing)

- **Code and symbols:** Use backticks for file paths, directory names, function names, class names, and inline code (e.g. `story.given`, `vitest.config.ts`).
- **Emphasis:** Use **bold** for key terms when emphasizing (e.g. **MUST**, **SHOULD**).
- **Citing code from the repo:** Use the standard citation format with line range and path: ```startLine:endLine:filepath``` (e.g. ```12:15:packages/executable-stories-cypress/src/reporter.ts```).
- **Math (if ever needed):** Inline math `\( ... \)`, block math `\[ ... \]`.
- **Valid markdown:** Ensure output is valid markdown (no broken backticks or brackets).

## Project context

Repo conventions, ESLint plugins, and verification: see **AGENTS.md** (and **CLAUDE.md** symlink) in the repo root.
