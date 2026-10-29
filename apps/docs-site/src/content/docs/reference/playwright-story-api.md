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

Doc methods: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.state`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.video`**, **`story.html`**, **`story.custom`**, same signatures as Vitest.

`story.screenshot({ page })` captures the page itself and takes two Playwright-only options for docs images. `highlight` outlines one or more locators. `mask` covers dates, IDs and other changing data with a grey box. Both apply to the capture only.

```typescript
await story.screenshot({
  page,
  alt: "Place the order",
  highlight: page.getByRole("button", { name: "Place order" }),
  mask: [page.getByTestId("order-date")],
});
```

`aria: true` also records the page's accessibility snapshot (Playwright's `ariaSnapshot()`) beside the image, so a frame can be checked as text. The `agent-text` format then lists what changed on screen since the previous screenshot, `executable-stories gif` names any step whose screen reads the same as the frame before, and `screenFrames` and `diffAria` from `executable-stories-core` give the same changes to your own checks, such as one asking a model whether each caption matches its frame.

```typescript
await story.screenshot({ page, alt: "Composer hidden", aria: true });
```

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

## When a test fails

With `StoryReporter` in your reporters, the failure output lists the story's steps, so you can see how far the story got without opening the report:

```
Error: expect(received).toBe(expected)

Story steps:
  ✓ Given a balance of 50
  ✓ When 100 is deposited
  ✗ Then the balance is 150
```

A wrapped step whose body throws gets the ✗. Otherwise the last step before the failing assertion does. A failed `expect.soft` marks the step it ran in, and a story with several soft failures marks each one. A timeout marks the step the test was in. The reporter adds the list at the end of each test, so reporters that print failures at the end of the run, such as `list`, show it; the raw run keeps the original error message.

## StoryOptions

Same as Vitest/Jest plus Playwright-specific `fixtures`: `tags`, `ticket`, `meta`, `traceUrlTemplate`, `fixtures`. See [Vitest story & doc API](/reference/vitest-story-api/) for detailed doc method descriptions.
