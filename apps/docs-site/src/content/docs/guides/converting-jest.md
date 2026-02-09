---
title: Converting existing Jest tests
description: Step-by-step guide from plain test() to story.init() and step markers
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Jest tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Jest tests might look like this:

```typescript
import { expect, test } from '@jest/globals';
import { add, subtract } from './calculator.js';

test('addition works', () => {
  expect(add(2, 3)).toBe(5);
});

test('subtraction works', () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Add story.init() and step markers

Keep your **native `describe` / `test`** (or `it`). At the start of each test that should appear in the report, call **`story.init()`** (no task; Jest gets the test name from `expect.getState()`). Then use **`story.given`**, **`story.when`**, **`story.then`** to mark steps. The **scenario title** in the generated docs is the **test name**.

```typescript
import { describe, expect, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { add } from './calculator.js';

describe('Calculator', () => {
  test('Calculator adds two numbers', () => {
    story.init();

    story.given('two numbers 2 and 3');
    const a = 2,
      b = 3;

    story.when('they are added');
    const result = add(a, b);

    story.then('the result is 5');
    expect(result).toBe(5);
  });
});
```

After running `jest`, the reporter writes Markdown with the scenario title and Given/When/Then for this test.

## Part 3: Minimal story (test name only)

You can add **`story.init()`** to any existing test so it appears in the story report even without step markers. The scenario will show the test name and no steps.

```typescript
import { expect, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { subtract } from './calculator.js';

test('Calculator subtracts two numbers', () => {
  story.init();
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to add given/when/then to every test. The test still runs as one Jest test; the reporter adds it to the story report with the scenario title from the test name.

## Part 4: Full patterns

Use **`story.note`**, **`story.json`**, **`story.table`**, etc. after steps for rich docs in the generated Markdown.

```typescript
import { describe, expect, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { add, multiply } from './calculator.js';

describe('Calculator', () => {
  test('Calculator multiplies two numbers', () => {
    story.init();
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    const result = multiply(7, 6);
    story.then('the result is 42');
    expect(result).toBe(42);
  });

  test('Calculator adds with a note', () => {
    story.init();
    story.given('two numbers 1 and 2');
    story.note(
      'Using small numbers; the note appears in the generated Markdown.',
    );
    story.when('they are added');
    story.then('the result is 3');
    expect(add(1, 2)).toBe(3);
  });
});
```

## Runnable example

The full refactor guide lives in the example app. Run it and open the generated docs:

- **Source:** [apps/jest-example/src/refactor-guide.story.test.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/jest-example/src/refactor-guide.story.test.ts)
- **Run:** `pnpm test` in `apps/jest-example` (or `npx jest`)
- **Generated output:** `apps/jest-example/src/refactor-guide.story.docs.md` (colocated with the test file, per reporter config)
