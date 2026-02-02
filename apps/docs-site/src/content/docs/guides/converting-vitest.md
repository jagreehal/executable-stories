---
title: Converting existing Vitest tests
description: Step-by-step guide from plain it() to story() and doc.story()
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Vitest tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Vitest tests might look like this:

```typescript
import { it, expect } from "vitest";
import { add, subtract } from "./calculator.js";

it("addition works", () => {
  expect(add(2, 3)).toBe(5);
});

it("subtraction works", () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Introduce story()

Express the same scenario as `story()` with `steps.given()`, `steps.when()`, and `steps.then()`. The reporter generates Markdown; one source of truth.

`story()` is `describe()` under the hood — use it at describe level, not inside `it()`.

```typescript
import { describe, expect } from "vitest";
import { story, type StepsApi } from "vitest-executable-stories";
import { add } from "./calculator.js";

describe("Part 2: Introduce story()", () => {
  story("Calculator adds two numbers", (steps: StepsApi) => {
    let a: number, b: number, result: number;

    steps.given("two numbers 2 and 3", () => {
      a = 2;
      b = 3;
    });

    steps.when("they are added", () => {
      result = add(a, b);
    });

    steps.then("the result is 5", () => {
      expect(result).toBe(5);
    });
  });
});
```

After running `vitest run`, the reporter writes Markdown with Given/When/Then for this scenario.

## Part 3: Framework-native with doc.story()

Keep your existing `it()` and add `doc.story("title", task)` so the test appears in the story report without rewriting to given/when/then. Vitest passes `task` in the test context.

```typescript
import { it, expect } from "vitest";
import { doc } from "vitest-executable-stories";
import { subtract } from "./calculator.js";

it("subtraction works", ({ task }) => {
  doc.story("Calculator subtracts two numbers", task);
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to rewrite every test as `story()` with steps. The test still runs as one Vitest test; the reporter adds it to the story report as a one-step story.

## Part 4: Full patterns

You can mix `story()` and framework-native `it()` in the same file. Use `steps.doc.note()` (or other doc helpers) inside a story for rich docs in the generated Markdown.

```typescript
import { story, doc, type StepsApi } from "vitest-executable-stories";
import { add, multiply } from "./calculator.js";

// story() with given/when/then
story("Calculator multiplies two numbers", (steps: StepsApi) => {
  steps.given("two numbers 7 and 6", () => {});
  steps.when("they are multiplied", () => {});
  steps.then("the result is 42", () => {
    expect(multiply(7, 6)).toBe(42);
  });
});

// Framework-native test in the same describe
it("multiply (framework-native)", ({ task }) => {
  doc.story("Calculator multiplies (framework-native)", task);
  expect(multiply(7, 6)).toBe(42);
});

// story() with doc.note() for rich docs
story("Calculator adds with a note", (steps: StepsApi) => {
  steps.doc.note("Using small numbers; the note appears in the generated Markdown.");
  steps.given("two numbers 1 and 2", () => {});
  steps.when("they are added", () => {});
  steps.then("the result is 3", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

## Runnable example

The full refactor guide lives in the example app. Run it and open the generated docs:

- **Source:** [apps/vitest-example/src/refactor-guide.story.test.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/vitest-example/src/refactor-guide.story.test.ts)
- **Run:** `pnpm test` in `apps/vitest-example` (or `npx vitest run`)
- **Generated output:** `apps/vitest-example/src/refactor-guide.story.docs.md` (colocated with the test file, per reporter config)
