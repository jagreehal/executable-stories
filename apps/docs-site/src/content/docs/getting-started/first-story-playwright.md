---
title: First Story (Playwright)
description: Write your first Playwright scenario and see the generated docs
---

## Write a story

Create a spec file (e.g. `src/login.story.spec.ts`):

```typescript
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Login', () => {
  test('user logs in successfully', async ({ page }, testInfo) => {
    story.init(testInfo);

    story.given('the user is on the login page');
    await page.goto('/login');

    story.when('the user submits valid credentials');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'secret');
    await page.click('button[type=submit]');

    story.then('the user sees the dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

Use **`story.init(testInfo)`** at the start of the test (pass **`testInfo`** from the test callback), then **`story.given`**, **`story.when`**, **`story.then`** to mark steps. Your test still receives Playwright fixtures (e.g. `{ page }`) for browser actions.

## Run tests

```bash
pnpm playwright test
```

## Generated output

The reporter writes Markdown to your configured path (e.g. `docs/user-stories.md`). For the story above, the output looks like:

```markdown
### User logs in successfully

- **Given** the user is on the login page
- **When** the user submits valid credentials
- **Then** the user sees the dashboard
```

## Next

[Playwright story & doc API](/reference/playwright-story-api/) — steps, doc methods, and options.

[Converting existing Playwright tests](/guides/converting-playwright/) — adopt executable-stories without rewriting existing tests.

[Recipes (Playwright)](/recipes/playwright/) — more examples.
