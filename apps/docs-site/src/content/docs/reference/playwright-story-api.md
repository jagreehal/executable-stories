---
title: Playwright story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc API for executable-stories-playwright
---

Playwright uses the same **story.init() + story.\*** pattern as Vitest and Jest. Call **`story.init(testInfo, [options])`** at the start of each test (pass **`testInfo`** from the test callback), then use **`story.given`**, **`story.when`**, **`story.then`**, and doc methods on the **`story`** object. Your test still receives Playwright fixtures (e.g. `{ page }`) for browser actions.

## story.init(testInfo, [options])

Initializes a story for the current test. Must be called at the start of each test that wants documentation.

| Item         | Description                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| **testInfo** | The Playwright `testInfo` from `test('...', async ({ page }, testInfo) => { ... })`.     |
| **options**  | Optional `StoryOptions`: `tags`, `ticket`, `meta`.                                       |
| **Example**  | `test('adds two numbers', async ({ page }, testInfo) => { story.init(testInfo); ... });` |

**Example with options:**

```typescript
test('admin deletes user', async ({ page }, testInfo) => {
  story.init(testInfo, {
    tags: ['admin', 'destructive'],
    ticket: 'JIRA-456',
  });
  story.given('the admin is logged in');
  await page.goto('/admin');
  story.when('the admin deletes the user');
  await page.click('button[data-action=delete]');
  story.then('the user is removed');
  await expect(page.getByText('User removed')).toBeVisible();
});
```

## Step markers and doc methods

Same as Vitest/Jest: **`story.given`**, **`story.when`**, **`story.then`**, **`story.and`**, **`story.but`**, plus AAA aliases. Steps accept an optional second argument **`StoryDocs`** for inline docs.

Doc methods: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.custom`** — same signatures as Vitest.

**Example:**

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

## StoryOptions

Same as Vitest/Jest: `tags`, `ticket`, `meta`. See [Vitest story & doc API](/reference/vitest-story-api/) for detailed doc method descriptions.
