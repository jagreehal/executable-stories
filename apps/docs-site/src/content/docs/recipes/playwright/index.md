---
title: Recipes (Playwright)
description: Example scenarios with Playwright code and generated output
slug: recipes/playwright
---

The same replicate scenarios are implemented in **Playwright** in [playwright-example](https://github.com/jagreehal/executable-stories/tree/main/apps/playwright-example). You use **native** `test.describe` / `test` and the **`story`** object: call **`story.init(testInfo)`** at the start of each test (pass **`testInfo`** from the callback), then **`story.given`**, **`story.when`**, **`story.then`**. Your test still receives **fixtures** (e.g. `{ page }`).

## Example: User logs in successfully

### Generated output

Same as Vitest (see [Vitest recipe](/recipes/vitest/user-logs-in-successfully/)).

### Playwright code

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Login', () => {
  test('User logs in successfully', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.given('the account is active');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## Full recipe list (Playwright)

The same 30 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/playwright-example/src/replicate.story.spec.ts`. Generated docs: `apps/playwright-example/src/replicate.docs.md`. For each scenario:

- **Generated output** is the same.
- **Code** uses `story.init(testInfo)` and `story.given` / `story.when` / `story.then` inside normal `test()` callbacks; fixtures (e.g. `async ({ page }) => { ... }`) work as usual.

[Playwright story & doc API](/reference/playwright-story-api/) — steps, fixtures, and doc usage.
