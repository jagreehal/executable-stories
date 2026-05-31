# executable-stories-playwright

BDD-style executable stories for Playwright Test with documentation generation. Uses Playwright’s native `test()`; step markers and optional callbacks register scenario metadata for the reporter.

## Install

```bash
pnpm add -D executable-stories-playwright executable-stories-formatters
```

## Usage

### Required test signature

Your test callback **must** accept `testInfo` as the second argument (Playwright provides it). Call `story.init(testInfo)` at the start of each test that should be documented. If you omit `testInfo` or forget to pass it to `story.init()`, the reporter and story API will not work correctly.

**When step callbacks need fixtures** (e.g. `async ({ page }) => { ... }`), pass the fixtures into `init` so the library can inject them into callbacks. Use either:

- `story.init(fixtures, testInfo)` — pass the test's first argument as the first argument to `init` (recommended).
- `story.init(testInfo, { fixtures })` — pass fixtures in the options object.

If you only call `story.init(testInfo)`, step callbacks are still invoked but do **not** receive a fixtures argument. Use marker-only steps or pass fixtures when you need fixture-aware callbacks.

```ts
import { test, expect } from '@playwright/test';
import { story } from 'executable-stories-playwright';

// Minimal: no fixtures in step callbacks
test('my scenario', async ({ page }, testInfo) => {
  story.init(testInfo);
  story.given('user is on page');
  await page.goto('/');
  story.then('page loaded');
  await expect(page).toHaveURL('/');
});

// Fixture-aware step callbacks: pass fixtures into init
test('login flow', async ({ page }, testInfo) => {
  story.init({ page }, testInfo);
  await story.given('user is on login page', async ({ page }) => {
    await page.goto('/login');
  });
  await story.when('user submits credentials', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
  });
  story.then('user sees dashboard');
});
```

Signature: `test('title', async ({ page }, testInfo) => { ... })` or `test('title', async ({}, testInfo) => { ... })`. Always pass `testInfo` into `story.init(...)`; pass the fixtures object as the first argument to `init` when you want step callbacks to receive it.

---

## Reporter

Add the executable-stories reporter to your Playwright config. Use the **reporter module path** (string). You can pass options as the second element of the tuple; the reporter does not require a constructor call at the call site.

**Config (`playwright.config.ts`):**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['html'],
    ['executable-stories-playwright/reporter', {
      formats: ['markdown'],
      outputDir: 'docs',
      outputName: 'user-stories',
      output: { mode: 'aggregated' },
    }],
  ],
  use: { ...devices['Desktop Chrome'] },
});
```

If you need a resolved path (e.g. in some setups):

```ts
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const reporterPath = require.resolve('executable-stories-playwright/reporter');

export default defineConfig({
  reporter: [
    ['list'],
    [reporterPath, { formats: ['markdown'], outputDir: 'docs', outputName: 'user-stories' }],
  ],
});
```

Options match [FormatterOptions](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters) (e.g. `formats`, `outputDir`, `outputName`, `output`, `markdown`, `html`). Optional `rawRunPath` writes the raw run JSON for use with the executable-stories CLI.

---

## Step styles

Same two styles as the Vitest package: **marker-only** (code after the marker) and **optional callback** (function as second argument). When you pass a function, it is run and its return value (including a Promise) is returned so `await story.when('...', async () => { ... })` works.

**Fixture-aware callbacks:** To have step callbacks receive Playwright fixtures (e.g. `{ page }`), pass fixtures into `story.init`: use `story.init({ page }, testInfo)` (or `story.init(testInfo, { fixtures: { page } })`). Then you can write e.g. `story.given('user is on login page', async ({ page }) => { await page.goto('/login'); });` and the callback will receive the same fixtures object.

---

## E2E example

Typical browser flow with `page`, navigation, locators, and Playwright `expect`:

```ts
import { test, expect } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test('user can play diagram animation', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['e2e', 'animation'] });

  story.given('the user is on the diagram page');
  await page.goto('/diagrams');
  await page.waitForSelector('.mermaid');

  story.when('the user clicks Play');
  await page.getByRole('button', { name: 'Play' }).click();

  story.then('an active node is visible');
  await expect(page.locator('.mf-state-active')).toBeVisible();
});
```

Marker-only keeps the test flat; for async work, the test is `async` and you `await` after each marker. To use step callbacks with fixtures, pass fixtures into `story.init` (see [Required test signature](#required-test-signature)) and then use callbacks that accept the fixtures argument.

---

## Story options (`story.init(testInfo, options)` or `story.init(fixtures, testInfo, options)`)

| Option               | Description |
| -------------------- | ----------- |
| `tags`               | String array for categorization (e.g. `['e2e', 'auth']`). |
| `ticket`             | Ticket/issue ID(s) for traceability. Single string or array (e.g. `'JIRA-123'` or `['JIRA-123', 'JIRA-456']`). Appears in reports and can be linked via `ticketUrlTemplate` in formatter options. |
| `meta`               | Arbitrary key-value metadata. |
| `traceUrlTemplate`   | URL template for OTel trace links; use `{traceId}` placeholder. When set (or via `OTEL_TRACE_URL_TEMPLATE`), the reporter can generate “View Trace” links in reports (e.g. to Grafana or your APM). |
| `fixtures`           | Playwright fixtures object (same as the test callback's first argument). When set, step callbacks receive this as their first argument. You can instead pass fixtures as the first argument: `story.init(fixtures, testInfo)`. |

Example:

```ts
story.init(testInfo, {
  tags: ['e2e', 'animations', 'play'],
  ticket: 'JIRA-123',
  traceUrlTemplate: 'https://grafana.example.com/explore?traceId={traceId}',
});
```

---

## Developer experience

- **API:** Top-level step functions: `given`, `when`, `then`, `and`, `but` from `executable-stories-playwright`, plus `story` object with `story.init()` and the same steps on `story` for a consistent entry point. Use `story.init(testInfo)` and then `story.given` / `story.when` / `story.then`, etc.
- **Modifiers:** Playwright’s `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow` on tests; use `story.skip` / `story.only` / `story.fixme` / `story.slow` for scenario-level modifiers.
- **Attach story to a plain test:** Call `story.init(testInfo)` inside a normal `test()` so that test appears in generated docs. Playwright does not export `doc`; scenario title comes from the Playwright test title.
- **Rich step docs:** `story.note()`, `story.json()`, `story.code()`, `story.mermaid()`, etc., or pass a `StoryDocs` object as the second argument when not using a callback. See the root [Features matrix](https://github.com/jagreehal/executable-stories#features-matrix).

---

## Exports

- **Main:** `story`, types from `executable-stories-playwright`.
- **Reporter:** default reporter from `executable-stories-playwright/reporter` (use as module path in config); reporter option types are re-exported.

For output formats and formatter options, see [executable-stories-formatters](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters).
