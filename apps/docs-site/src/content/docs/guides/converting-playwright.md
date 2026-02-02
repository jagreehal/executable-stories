---
title: Converting existing Playwright tests
description: Step-by-step guide from plain test() to story() and doc.story()
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Playwright tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Playwright tests might look like this:

```typescript
import { test, expect } from "@playwright/test";
import { add, subtract } from "./calculator.js";

test("addition works", async () => {
  expect(add(2, 3)).toBe(5);
});

test("subtraction works", async () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Introduce story()

Express the same scenario as `story()` with top-level `given()`, `when()`, and `then()`. The reporter generates Markdown; one source of truth.

`story()` is `test.describe()` under the hood — use it at describe level, not inside `test()`. Step callbacks can be async and receive Playwright fixtures (e.g. `{ page }`) when you need them.

```typescript
import { test, expect } from "@playwright/test";
import { story, given, when, then } from "playwright-executable-stories";
import { add } from "./calculator.js";

test.describe("Part 2: Introduce story()", () => {
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

After running `playwright test`, the reporter writes Markdown with Given/When/Then for this scenario.

## Part 3: Framework-native with doc.story()

Keep your existing `test()` and add `doc.story("title")` so the test appears in the story report without rewriting to given/when/then.

```typescript
import { test, expect } from "@playwright/test";
import { doc } from "playwright-executable-stories";
import { subtract } from "./calculator.js";

test("subtraction works", async () => {
  doc.story("Calculator subtracts two numbers");
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to rewrite every test as `story()` with steps. The test still runs as one Playwright test; the reporter adds it to the story report as a one-step story.

## Part 4: Full patterns

You can mix `story()` and framework-native `test()` in the same file. Use `doc.note()` (or other doc helpers) inside a story for rich docs in the generated Markdown. In E2E tests, step callbacks can use fixtures: `given("user is on login page", async ({ page }) => { await page.goto("/login"); });`.

```typescript
import { story, given, when, then, doc } from "playwright-executable-stories";
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
test("multiply (framework-native)", async () => {
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

- **Source:** [apps/playwright-example/src/refactor-guide.story.spec.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/playwright-example/src/refactor-guide.story.spec.ts)
- **Run:** `pnpm test` in `apps/playwright-example` (or `npx playwright test`)
- **Generated output:** `apps/playwright-example/src/refactor-guide.docs.md` (or colocated path per reporter config)
