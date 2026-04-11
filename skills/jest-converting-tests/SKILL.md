---
name: jest-converting-tests
description: >
  Incrementally adopt executable-stories in Jest. Add story.init() and
  top-level step imports to existing test blocks. No task argument needed.
  File naming .story.test.ts. Progressive enhancement without rewriting.
type: lifecycle
library: executable-stories-jest
library_version: "7.0.1"
requires:
  - jest-story-api
sources:
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/guides/converting-jest.md"
---

This skill builds on jest-story-api. Read jest-story-api first.

# Converting Existing Jest Tests

## Setup

Install the packages and configure:

```bash
npm install -D executable-stories-jest executable-stories-formatters
```

```javascript
// jest.config.mjs
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    ["executable-stories-jest/reporter", { formats: ["markdown"] }],
  ],
};
```

## Core Patterns

### Step 1: Rename the file

```
# Before
test/calculator.test.ts

# After
test/calculator.story.test.ts
```

### Step 2: Add story.init() and step markers

```typescript
// Before
import { describe, expect, it } from "@jest/globals";

describe("Calculator", () => {
  it("adds two numbers", () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
});
```

```typescript
// After
import { describe, expect, it } from "@jest/globals";
import { story, given, when, then } from "executable-stories-jest";

describe("Calculator", () => {
  it("adds two numbers", () => {
    story.init();

    given("two numbers 2 and 3");
    const a = 2, b = 3;

    when("they are added");
    const result = add(a, b);

    then("the result is 5");
    expect(result).toBe(5);
  });
});
```

Key difference from Vitest: no `({ task })` needed. `story.init()` takes no arguments.

### Step 3: Minimal story

```typescript
it("subtracts two numbers", () => {
  story.init();
  expect(subtract(10, 4)).toBe(6);
});
```

### Step 4: Add doc entries

```typescript
it("handles division by zero", () => {
  story.init({ tags: ["edge-case"] });

  given("a divisor of zero");
  story.note("This tests the error handling path");

  when("division is attempted");
  const fn = () => divide(10, 0);

  then("an error is thrown");
  expect(fn).toThrow("Division by zero");
});
```

## Common Mistakes

### HIGH Adding ({ task }) like Vitest

Wrong:

```typescript
it("my test", ({ task }) => {
  story.init(task);
});
```

Correct:

```typescript
it("my test", () => {
  story.init();
});
```

Jest does not provide a `task` object. `story.init()` reads the test name from `expect.getState().currentTestName`.

Source: packages/executable-stories-jest/src/story-api.ts

### HIGH Forgetting setupFilesAfterEnv

Without `setupFilesAfterEnv: ["executable-stories-jest/setup"]` in jest.config, stories are never flushed to disk and the reporter produces empty output.

Source: packages/executable-stories-jest/src/reporter.ts
