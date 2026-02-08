---
title: Converting existing Vitest tests
description: Step-by-step guide from plain it() to story.init() and step markers
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Vitest tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Vitest tests might look like this:

```typescript
import { expect, it } from 'vitest';
import { add, subtract } from './calculator.js';

it('addition works', () => {
  expect(add(2, 3)).toBe(5);
});

it('subtraction works', () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Add story.init() and step markers

Keep your **native `describe` / `it`**. At the start of each test that should appear in the report, call **`story.init(task)`** (with **`task`** from the callback). Then use **`story.given`**, **`story.when`**, **`story.then`** to mark steps. The **scenario title** in the generated docs is the **test name** (the first argument to `it()`).

```typescript
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add } from './calculator.js';

describe('Calculator', () => {
  it('Calculator adds two numbers', ({ task }) => {
    story.init(task);

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

After running `vitest run`, the reporter writes Markdown with the scenario title and Given/When/Then for this test.

## Part 3: Minimal story (test name only)

You can add **`story.init(task)`** to any existing `it()` so the test appears in the story report even without step markers. The scenario will show the test name and no steps (or add one or two steps if you like).

```typescript
import { story } from 'executable-stories-vitest';
import { expect, it } from 'vitest';
import { subtract } from './calculator.js';

it('Calculator subtracts two numbers', ({ task }) => {
  story.init(task);
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to add given/when/then to every test. The test still runs as one Vitest test; the reporter adds it to the story report with the scenario title from the test name.

## Part 4: Full patterns

Use **`story.note`**, **`story.json`**, **`story.table`**, etc. after steps (or before any step for story-level docs) for rich docs in the generated Markdown.

```typescript
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { add, multiply } from './calculator.js';

describe('Calculator', () => {
  it('Calculator multiplies two numbers', ({ task }) => {
    story.init(task);
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    const result = multiply(7, 6);
    story.then('the result is 42');
    expect(result).toBe(42);
  });

  it('Calculator adds with a note', ({ task }) => {
    story.init(task);
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

- **Source:** [apps/vitest-example/src/refactor-guide.story.test.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/vitest-example/src/refactor-guide.story.test.ts)
- **Run:** `pnpm test` in `apps/vitest-example` (or `npx vitest run`)
- **Generated output:** `apps/vitest-example/src/refactor-guide.story.docs.md` (colocated with the test file, per reporter config)
