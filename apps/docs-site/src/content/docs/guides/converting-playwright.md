---
title: Converting existing Playwright tests
description: Step-by-step guide from plain test() to story.init() and step markers
---

This guide teaches executable-stories patterns **one concept at a time**. We start from plain Playwright tests and add story structure and generated docs without throwing away existing tests.

## Part 1: Baseline

Your existing Playwright tests might look like this:

```typescript
import { expect, test } from '@playwright/test';
import { add, subtract } from './calculator.js';

test('addition works', async () => {
  expect(add(2, 3)).toBe(5);
});

test('subtraction works', async () => {
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this is the baseline:** Tests pass and give confidence, but no user-story docs are generated and stakeholders don't see readable Given/When/Then. The next steps add both.

## Part 2: Add story.init() and step markers

Keep your **native `test.describe` / `test`**. At the start of each test that should appear in the report, call **`story.init(testInfo)`** (pass **`testInfo`** from the test callback). Then use **`story.given`**, **`story.when`**, **`story.then`** to mark steps. The **scenario title** in the generated docs is the **test name**. Your test still receives Playwright fixtures (e.g. `{ page }`) for browser actions.

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add } from './calculator.js';

test.describe('Calculator', () => {
  test('Calculator adds two numbers', async ({ task }, testInfo) => {
    story.init(testInfo);

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

Note: Playwright's test callback is `async ({ page }, testInfo) => { ... }` — the second argument is `testInfo`. After running `playwright test`, the reporter writes Markdown with the scenario title and Given/When/Then.

## Part 3: Minimal story (test name only)

You can add **`story.init(testInfo)`** to any existing test so it appears in the story report even without step markers. The scenario will show the test name and no steps.

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { subtract } from './calculator.js';

test('Calculator subtracts two numbers', async ({ task }, testInfo) => {
  story.init(testInfo);
  expect(subtract(10, 4)).toBe(6);
});
```

**Why this helps:** No need to add given/when/then to every test. The test still runs as one Playwright test; the reporter adds it to the story report with the scenario title from the test name.

## Part 4: Full patterns

Use **`story.note`**, **`story.json`**, **`story.table`**, etc. after steps for rich docs in the generated Markdown. In E2E tests, use fixtures in the test body: `await page.goto("/login")`, etc.

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, multiply } from './calculator.js';

test.describe('Calculator', () => {
  test('Calculator multiplies two numbers', async ({ task }, testInfo) => {
    story.init(testInfo);
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    const result = multiply(7, 6);
    story.then('the result is 42');
    expect(result).toBe(42);
  });

  test('Calculator adds with a note', async ({ task }, testInfo) => {
    story.init(testInfo);
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

- **Source:** [apps/playwright-example/src/refactor-guide.story.spec.ts](https://github.com/jagreehal/executable-stories/blob/main/apps/playwright-example/src/refactor-guide.story.spec.ts)
- **Run:** `pnpm test` in `apps/playwright-example` (or `npx playwright test`)
- **Generated output:** `apps/playwright-example/src/refactor-guide.docs.md` (or colocated path per reporter config)
