---
name: executable-stories-playwright
description: Write Given/When/Then story tests for Playwright with automatic Markdown doc generation. Use when creating BDD-style E2E tests or generating user story documentation from browser tests.
version: 2.2.0
libraries: ['@playwright/test']
---

# executable-stories-playwright

TypeScript-first story testing for Playwright. Tests and documentation from the same code.

## Quick Start

```ts
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('User Authentication', () => {
  test('logs in with valid credentials', async ({ page }, testInfo) => {
    story.init(testInfo);

    story.given('user is on login page');
    await page.goto('/login');

    story.when('user submits valid credentials');
    await page.fill('[name=email]', 'user@example.com');
    await page.click('button[type=submit]');

    story.then('user sees the dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## API Reference

### story.init(testInfo, options?) / story.init(fixtures, testInfo)

Initialize a story at the start of each test. Required before using other story methods.

- `story.init(testInfo)` — no fixtures; step callbacks receive no argument.
- `story.init(fixtures, testInfo)` or `story.init(testInfo, { fixtures })` — step callbacks receive fixtures as first argument (e.g. `story.given('...', async ({ page }) => { await page.goto('/'); });`).

```ts
test('test name', async ({ page }, testInfo) => {
  story.init(testInfo);
  // or with fixtures for step callbacks:
  story.init({ page }, testInfo);
  // or: story.init(testInfo, { tags: ['smoke'], fixtures: { page } });
});
```

### Step Markers (marker-only or optional callback)

**Marker-only:** Pass text (and optionally inline StoryDocs). Code follows the marker.

```ts
story.given('precondition');
await page.goto('/login');

story.when('action occurs');
await page.click('button');

story.then('expected result');
await expect(page).toHaveURL('/dashboard');
```

**Optional callback:** Second argument can be a function. Step is recorded, then callback runs. Return value is passed through; if Promise, use `await story.when('...', async () => { ... })`. With `story.init({ page }, testInfo)`, the callback receives fixtures: `story.given('...', async ({ page }) => { await page.goto('/'); });`. Step gets `wrapped: true` and `durationMs`.

```ts
story.init({ page }, testInfo);
story.given('user is on login page', async ({ page }) => { await page.goto('/login'); });
await story.when('user submits', async ({ page }) => { await page.click('button[type=submit]'); });
story.then('dashboard is visible', () => { expect(true).toBe(true); });
```

| Method                              | Keyword | Purpose               |
| ----------------------------------- | ------- | --------------------- |
| `story.given(text)` / `(text, fn?)` | Given   | Precondition/setup    |
| `story.when(text)` / `(text, fn?)`  | When    | Action                |
| `story.then(text)` / `(text, fn?)` | Then    | Assertion             |
| `story.and(text)` / `(text, fn?)`  | And     | Continuation          |
| `story.but(text)` / `(text, fn?)`  | But     | Negative continuation |

### Step Aliases

```ts
// AAA Pattern
story.arrange('setup');
story.act('action');
story.assert('check');

// Alternative names
story.setup('initial state');
story.context('additional context');
story.execute('operation');
story.action('user action');
story.verify('outcome');
```

### Inline Docs

Attach documentation directly to steps:

```ts
story.given('valid credentials', {
  json: {
    label: 'Credentials',
    value: { email: 'test@example.com', password: '***' },
  },
  note: 'Password is masked for security',
});

story.when('payment is processed', {
  kv: { 'Payment ID': 'pay_123', Amount: '$99.99' },
});

story.then('order is confirmed', {
  table: {
    label: 'Order Summary',
    columns: ['Item', 'Price'],
    rows: [['Widget', '$49.99']],
  },
});
```

### Standalone Doc Methods

Call after a step to attach documentation:

```ts
story.given('an order exists');
story.json({ label: 'Order', value: { id: 123, items: ['widget'] } });

story.when('payment processed');
story.kv({ label: 'Payment ID', value: 'pay_123' });
story.kv({ label: 'Amount', value: '$99.99' });

story.then('confirmation sent');
story.screenshot({ path: '/screenshots/confirmation.png', alt: 'Email sent' });
```

| Method                      | Signature                   | Purpose          |
| --------------------------- | --------------------------- | ---------------- |
| `story.note(text)`          | `string`                    | Free text note   |
| `story.tag(names)`          | `string \| string[]`        | Tags             |
| `story.kv(options)`         | `{ label, value }`          | Key-value pair   |
| `story.json(options)`       | `{ label, value }`          | JSON code block  |
| `story.code(options)`       | `{ label, content, lang? }` | Code block       |
| `story.table(options)`      | `{ label, columns, rows }`  | Markdown table   |
| `story.link(options)`       | `{ label, url }`            | Hyperlink        |
| `story.section(options)`    | `{ title, markdown }`       | Markdown section |
| `story.mermaid(options)`    | `{ code, title? }`          | Mermaid diagram  |
| `story.screenshot(options)` | `{ path, alt? }`            | Screenshot       |
| `story.custom(options)`     | `{ type, data }`            | Custom entry     |

### Story-Level Docs

Docs called before any step attach to the story level:

```ts
test('complex workflow', async ({ page }, testInfo) => {
  story.init(testInfo);

  // These attach to story level (before steps)
  story.note('Requires running database');
  story.link({ label: 'API Docs', url: 'https://docs.example.com' });

  story.given('database is seeded');
  // ...
});
```

## Using test.beforeEach

```ts
test.describe('User Profile', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('user is logged in');
    await page.goto('/dashboard');
  });

  test('updates email', async ({ page }) => {
    story.when('user changes email');
    await page.fill('[name=email]', 'new@example.com');

    story.then('email is updated');
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

## Test Modifiers

Use native Playwright modifiers - they work seamlessly:

```ts
test.skip('not implemented yet', async ({ page }, testInfo) => {
  story.init(testInfo);
  // ...
});

test.fixme('needs fix', async ({ page }, testInfo) => {
  story.init(testInfo);
  // ...
});

test.only('debug this', async ({ page }, testInfo) => {
  story.init(testInfo);
  // ...
});
```

## Reporter Setup

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  reporter: [['list'], ['executable-stories-playwright/reporter']],
  use: { ...devices['Desktop Chrome'] },
});
```

### Reporter Options

```ts
[
  'executable-stories-playwright/reporter',
  {
    // Output format selection
    formats: ['markdown'], // "markdown" | "html" | "junit" | "cucumber-json"
    outputDir: 'docs', // Output directory
    outputName: 'user-stories', // Base filename (produces user-stories.md)

    // Output routing
    output: {
      mode: 'aggregated', // "aggregated" | "colocated"
      // colocatedStyle: "mirrored",          // "mirrored" | "adjacent" (when mode: "colocated")
    },

    // Markdown-specific options
    markdown: {
      title: 'User Stories',
      sortScenarios: 'source', // "alpha" | "source"
      suiteSeparator: ' - ',
      includeStatusIcons: true, // Show ✅❌⏩📝
      includeErrors: true, // Show failure details
      includeMetadata: true, // Show date/version/git SHA
    },
  },
];
```

## Generated Output

```markdown
## Calculator

### ✅ adds two numbers

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8

### ❌ divides by zero

- **Given** a number 10 and zero
  > Division by zero should throw an error
- **When** division is attempted
- **Then** an error is thrown

**Failure**

    Error: Cannot divide by zero
```

## Playwright-Specific Features

### Using Fixtures

All Playwright fixtures are available in the test callback - just use them after step markers:

```ts
test('API test', async ({ request }, testInfo) => {
  story.init(testInfo);

  story.given('API is ready');
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});
```

### Capturing Screenshots in Docs

```ts
test('login flow', async ({ page }, testInfo) => {
  story.init(testInfo);

  story.given('user is on login page');
  await page.goto('/login');

  story.when('user fills form');
  await page.fill('[name="email"]', 'user@example.com');

  // Capture screenshot and add to docs
  await page.screenshot({ path: 'screenshots/login-form.png' });
  story.screenshot({
    path: 'screenshots/login-form.png',
    alt: 'Login form filled',
  });

  story.then('form is ready to submit');
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});
```

## Formatter CLI (CI, history, notifications)

Reporters write raw JSON consumed by the **executable-stories** formatter CLI. In CI the CLI auto-detects the environment and can send Slack/Teams/webhook notifications and persist run history (`--history-file` for flakiness/stability/performance in HTML). No test code changes—reporter emits CI and run metadata.

## OpenTelemetry spans

When [autotel](https://github.com/jagreehal/autotel) is available, the reporter emits spans for story steps and scenarios (lazy-loaded). Enables trace waterfall in the HTML report. Optional; no API change in tests.

## Framework-native attach (doc.story)

To attach story metadata to a plain `test()`: `test('title', async ({ page }, testInfo) => { doc.story('Scenario title', testInfo); story.init(testInfo); ... });` or `doc.story('Title', (s) => { s.given(...); ... });`. Scenario heading in docs comes from the story title, not the test name.

## Best Practices

- MUST call `story.init(testInfo)` at the start of each test
- MUST use native Playwright `test.describe`/`test` for full IDE support
- MUST always `await` Playwright actions
- SHOULD use `.story.spec.ts` suffix for story tests
- SHOULD keep step descriptions in natural language
- NEVER put assertions in `given` steps
- NEVER put setup in `then` steps

## Project context

Repo conventions, ESLint plugins, and verification: see **AGENTS.md** (and **CLAUDE.md** symlink) in the repo root.
