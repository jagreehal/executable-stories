---
name: vitest-converting-tests
description: >
  Use when incrementally adopting executable-stories in an existing Vitest
  test suite, converting it/test blocks to story tests, or adding
  story.init(task) without a full rewrite. Progressive enhancement of
  .story.test.ts files.
metadata:
  type: lifecycle
  library: executable-stories-vitest
  library_version: "8.8.2"
  requires:
    - vitest-story-api
  sources:
    - "jagreehal/executable-stories:apps/docs-site/src/content/docs/guides/converting-vitest.md"
---

This skill builds on vitest-story-api. Read vitest-story-api first.

# Converting Existing Vitest Tests

## Setup

Install the package:

```bash
npm install -D executable-stories-vitest executable-stories-formatters
```

## Core Patterns

### Step 1: Rename the file

```
# Before
test/calculator.test.ts

# After
test/calculator.story.test.ts
```

The reporter filters for `.story.test.ts` files.

### Step 2: Add story.init() and step markers

```typescript
// Before
import { describe, expect, it } from "vitest";

describe("Calculator", () => {
  it("adds two numbers", () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
});
```

```typescript
// After
import { describe, expect, it } from "vitest";
import { story } from "executable-stories-vitest";

describe("Calculator", () => {
  it("adds two numbers", ({ task }) => {
    story.init(task);

    story.given("two numbers 2 and 3");
    const a = 2, b = 3;

    story.when("they are added");
    const result = add(a, b);

    story.then("the result is 5");
    expect(result).toBe(5);
  });
});
```

Key change: add `({ task })` to the callback parameter.

### Step 3: Minimal story (test name only)

If you want a test to appear in docs without step markers:

```typescript
it("subtracts two numbers", ({ task }) => {
  story.init(task);
  // Test runs normally, appears in report with test name as scenario title
  expect(subtract(10, 4)).toBe(6);
});
```

### Step 4: Add doc entries for richer output

```typescript
it("handles division by zero", ({ task }) => {
  story.init(task, { tags: ["edge-case"] });

  story.given("a divisor of zero");
  story.note("This tests the error handling path");

  story.when("division is attempted");
  const fn = () => divide(10, 0);

  story.then("an error is thrown");
  expect(fn).toThrow("Division by zero");
});
```

### Progressive adoption

Convert tests one file at a time. Non-story tests continue working normally. The reporter only processes files matching `*.story.test.ts` with `story.init()` calls.

## Common Mistakes

### HIGH Forgetting ({ task }) in callback

Wrong:

```typescript
it("my test", () => {
  story.init(task); // ReferenceError: task is not defined
});
```

Correct:

```typescript
it("my test", ({ task }) => {
  story.init(task);
});
```

Vitest passes the test context as the first callback argument. You must destructure `task` from it.

Source: packages/executable-stories-vitest/src/story-api.ts

### MEDIUM Using wrong file extension

Wrong: `calculator.story.spec.ts` (Playwright convention)
Correct: `calculator.story.test.ts` (Vitest convention)

Source: CLAUDE.md — file naming conventions
