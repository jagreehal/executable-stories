---
title: Playwright story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc API for executable-stories-playwright
---

Playwright uses the same **story.init() + story.\*** pattern as Vitest and Jest. Call **`story.init(testInfo, [options])`** at the start of each test, or **`story.init(fixtures, testInfo, [options])`** when you want step callbacks to receive Playwright fixtures. Your test still receives Playwright fixtures exactly as normal.

Playwright also exports top-level **`given`**, **`when`**, **`then`**, **`and`**, and **`but`** helpers if you prefer that style after initialization.

## story.init(testInfo, [options])

You can initialize Playwright stories in three supported forms:

- `story.init(testInfo)`
- `story.init(testInfo, options)`
- `story.init(fixtures, testInfo, options)`

Initializes a story for the current test. Must be called at the start of each test that wants documentation.

| Item         | Description                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| **testInfo** | The Playwright `testInfo` from `test('...', async ({ page }, testInfo) => { ... })`.     |
| **fixtures** | Optional first argument when step callbacks need fixtures such as `{ page }`.            |
| **options**  | Optional `StoryOptions`: `tags`, `ticket`, `meta`, `traceUrlTemplate`, `fixtures`.       |
| **Example**  | `test('adds two numbers', async ({ page }, testInfo) => { story.init({ page }, testInfo); ... });` |

**Example with options:**

```typescript
test('admin deletes user', async ({ page }, testInfo) => {
  story.init({ page }, testInfo, {
    tags: ['admin', 'destructive'],
    ticket: 'JIRA-456',
    covers: ['src/admin/users.ts'],
    traceUrlTemplate: 'https://grafana.example.com/explore?traceId={traceId}',
  });
  await story.given('the admin is logged in', async ({ page }) => {
    await page.goto('/admin');
  });
  await story.when('the admin deletes the user', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete' }).click();
  });
  story.then('the user is removed');
  await expect(page.getByText('User removed')).toBeVisible();
});
```

## Step markers and doc methods

Same as Vitest/Jest: **`story.given`**, **`story.when`**, **`story.then`**, **`story.and`**, **`story.but`**, plus AAA aliases. Steps accept an optional second argument **`StoryDocs`** for inline docs.

Doc methods: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.state`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.video`**, **`story.html`**, **`story.custom`** — same signatures as Vitest.

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
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();

    story.then('the user sees the dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## StoryOptions

Same as Vitest/Jest plus Playwright-specific `fixtures`: `tags`, `ticket`, `meta`, `traceUrlTemplate`, `fixtures`. See [Vitest story & doc API](reference/vitest-story-api/) for detailed doc method descriptions.
