---
title: Converting existing Jest tests
description: Step-by-step guide from plain test() to story() and doc.story()
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Jest tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Jest tests might look like this:

```typescript
import { test, expect } from "@jest/globals";
import { add, subtract } from "./calculator.js";

test("addition works", () => {
  expect(add(2, 3)).toBe(5);
});

test("subtraction works", () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Introduce story()

Express the same scenario as `story()` with top-level `given()`, `when()`, and `then()`. The reporter generates Markdown; one source of truth.

`story()` is `describe()` under the hood — use it at describe level, not inside `test()`.

```typescript
import { describe, expect } from "@jest/globals";
import { story, given, when, then } from "jest-executable-stories";
import { add } from "./calculator.js";

describe("Part 2: Introduce story()", () => {
  story("Calculator adds two numbers", () => {
    let a: number, b: number, result: number;

    given("two numbers 2 and 3", () => {
      a = 2;
      b = 3;
    });

    when("they are added", () => {
      result = add(a, b);
    });

    then("the result is 5", () => {
      expect(result).toBe(5);
    });
  });
});
```

After running `jest`, the reporter writes Markdown with Given/When/Then for this scenario.

## Part 3: Framework-native with doc.story()

Keep your existing `test()` and add `doc.story("title")` so the test appears in the story report without rewriting to given/when/then.

```typescript
import { test, expect } from "@jest/globals";
import { doc } from "jest-executable-stories";
import { subtract } from "./calculator.js";

test("subtraction works", () => {
  doc.story("Calculator subtracts two numbers");
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to rewrite every test as `story()` with steps. The test still runs as one Jest test; the reporter adds it to the story report as a one-step story.

## Part 4: Full patterns

You can mix `story()` and framework-native `test()` in the same file. Use `doc.note()` (or other doc helpers) inside a story for rich docs in the generated Markdown.

```typescript
import { story, given, when, then, doc } from "jest-executable-stories";
import { add, multiply } from "./calculator.js";

// story() with given/when/then
story("Calculator multiplies two numbers", () => {
  given("two numbers 7 and 6", () => {});
  when("they are multiplied", () => {});
  then("the result is 42", () => {
    expect(multiply(7, 6)).toBe(42);
  });
});

// Framework-native test in the same describe
test("multiply (framework-native)", () => {
  doc.story("Calculator multiplies (framework-native)");
  expect(multiply(7, 6)).toBe(42);
});

// story() with doc.note() for rich docs
story("Calculator adds with a note", () => {
  doc.note("Using small numbers; the note appears in the generated Markdown.");
  given("two numbers 1 and 2", () => {});
  when("they are added", () => {});
  then("the result is 3", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

## Runnable example

The full refactor guide lives in the example app. Run it and open the generated docs:

- **Source:** [apps/jest-example/src/refactor-guide.story.test.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/jest-example/src/refactor-guide.story.test.ts)
- **Run:** `pnpm test` in `apps/jest-example` (or `npx jest`)
- **Generated output:** `apps/jest-example/src/refactor-guide.story.docs.md` (colocated with the test file, per reporter config)
