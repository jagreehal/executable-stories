---
name: playwright-story-api
description: >
  Use when writing BDD story tests in Playwright with
  executable-stories-playwright: story.init(testInfo), async steps with
  fixtures, or doc entries.
type: core
library: executable-stories-playwright
library_version: "8.5.7"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-playwright/src/story-api.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/reference/playwright-story-api.md"
---

# executable-stories-playwright — Story API

## Setup

```typescript
import { test, expect } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";

test.describe("Login page", () => {
  test("authenticates with valid credentials", async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ["auth"], ticket: "AUTH-42", covers: ["src/auth.ts"] });

    given("the login page is loaded");
    await page.goto("/login");

    when("valid credentials are entered");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("secret");
    await page.getByRole("button", { name: "Sign in" }).click();

    then("the dashboard is shown");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
```

File naming: `*.story.spec.ts`.

Playwright uses top-level step exports. `story.init(testInfo)` requires the `testInfo` parameter from the test callback.

## Core Patterns

### Top-level step exports with fixtures

```typescript
import { story, given, when, then, and, but } from "executable-stories-playwright";

test("blocks suspended user login", async ({ page }, testInfo) => {
  story.init(testInfo);

  given("the user account exists");          // renders "Given"
  given("the account is suspended");          // renders "And" (auto-converted)
  when("the user submits valid credentials");
  await page.getByLabel("Email").fill("user@test.com");
  await page.getByRole("button", { name: "Sign in" }).click();

  then("the user sees an error message");
  await expect(page.getByRole("alert")).toBeVisible();

  but("the user is not logged in");           // renders "But" (always)
  await expect(page).toHaveURL("/login");
});
```

### Doc entries with screenshots

Prefer `story.screenshot({ page, alt })` — it captures the screenshot itself
and inlines the bytes directly, so there's no separate `path` to keep in
sync and nothing for Playwright's output cleanup to delete before the report
is built:

```typescript
test("checkout flow", async ({ page }, testInfo) => {
  story.init(testInfo);

  given("a cart with items");
  story.json({ label: "Cart", value: { items: 3, total: 150 } });

  when("the user completes checkout");
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.waitForURL("/confirmation");

  then("the confirmation page is shown");
  await story.screenshot({ page, alt: "Order confirmation" }); // async — capture, no path needed
  story.table({
    label: "Order details",
    columns: ["Item", "Qty", "Price"],
    rows: [["Widget", "3", "$50"]],
  });
});
```

**Storyboards:** when two or more steps each carry a screenshot, reports
render a horizontal filmstrip at the top of the scenario (one captioned
thumbnail per step, linking to the full-size image). To give stakeholders a
visual walkthrough, call `await story.screenshot({ page, alt })` once after
each step — the `alt` becomes the frame caption. Derived automatically; no
option to set.

The older `story.screenshot({ path, alt })` form attaches a screenshot that
already exists on disk (e.g. one taken earlier for another purpose) — the
caller must write the file to `path` first (typically
`await page.screenshot({ path })`). If nothing wrote to that exact path
before `story.screenshot()` runs, it warns at the call site and the report
falls back to a "Screenshot unavailable" placeholder rather than a broken
image — that warning almost always means the preceding `page.screenshot()`
call is missing or its `path` doesn't match.

### Embedded HTML (story.html)

Embed generated HTML (charts, single-file reports, skill/agent output) in a
sandboxed iframe in the HTML report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed
through; default 400px).

```typescript
// Generated in-test — never touches disk. The safest option: inherently
// self-contained, nothing to resolve.
story.html({ content: chartHtml, title: "Latency chart", height: "60vh" });

// Remote URL — rendered via iframe src with an open-in-new-tab button.
story.html({ url: "https://dash.example.com/run/42", height: 600 });

// Local file — read at capture time and inlined, so an absolute runner path
// still resolves when the report is downloaded as a CI artifact.
story.html({ path: testInfo.outputPath("summary.html"), title: "Summary" });
```

**The embedded HTML must be self-contained (a single file).** Local files are
read at capture time and inlined as the iframe's `srcdoc`; relative references
to sibling CSS/JS/images are **not** rewritten or bundled, so a multi-file
report will render broken. Use your tool's single-file/inline mode, or pass the
markup via `content`. Directory bundling is planned.

All embedded HTML renders inside `<iframe sandbox="allow-scripts">` — scripts
run (charts work) but cannot touch the report DOM, cookies, or storage.

### Step wrappers with timing

```typescript
const response = await story.fn("When", "the API is called", async () => {
  return page.request.get("/api/data");
});

await story.expect("the response is successful", async () => {
  expect(response.status()).toBe(200);
});
```

### Suite headings from test.describe

```typescript
test.describe("Authentication", () => {
  test("valid login", async ({ page }, testInfo) => {
    story.init(testInfo);
    // Produces "## Authentication" heading in generated docs
  });
});
```

Suite path comes from `testInfo.titlePath`. Describe titles become `##` headings in generated docs.

## Common Mistakes

### CRITICAL Missing testInfo argument in story.init()

Wrong:

```typescript
test("my test", async ({ page }) => {
  story.init();
  given("something");
});
```

Correct:

```typescript
test("my test", async ({ page }, testInfo) => {
  story.init(testInfo);
  given("something");
});
```

Without `testInfo`, story metadata is not linked to the test. The `testInfo` parameter must be the second argument in the Playwright test callback.

Source: packages/executable-stories-playwright/src/story-api.ts

### HIGH Using .story.test.ts file extension

Wrong:

```
tests/login.story.test.ts
```

Correct:

```
tests/login.story.spec.ts
```

Playwright uses `.spec.ts` by convention. The reporter filters for `.story.spec.ts` files. Using `.test.ts` may cause the reporter to miss story metadata.

Source: CLAUDE.md — "Story test files use .story.spec.ts (playwright)"

### HIGH Forgetting testInfo in callback destructuring

Wrong:

```typescript
test("my test", async ({ page }) => {
  story.init(testInfo);  // testInfo is undefined
});
```

Correct:

```typescript
test("my test", async ({ page }, testInfo) => {
  story.init(testInfo);
});
```

`testInfo` is the second parameter of the Playwright test callback, not a fixture. It must be explicitly named after the fixtures object.

Source: packages/executable-stories-playwright/src/story-api.ts

### MEDIUM Calling steps before story.init()

Wrong:

```typescript
test("my test", async ({ page }, testInfo) => {
  given("something");
  story.init(testInfo);
});
```

Correct:

```typescript
test("my test", async ({ page }, testInfo) => {
  story.init(testInfo);
  given("something");
});
```

Steps called before `init()` are silently dropped because no story context exists.

Source: packages/eslint-plugin-executable-stories-playwright/src/rules/require-story-context-for-steps.ts

## Parameterized Scenarios (Scenario Outline equivalent)

Use Playwright's data-driven pattern with a `for...of` loop to produce one scenario per data row — the framework-native replacement for Cucumber's Scenario Outline + Examples. The scenario name comes from the `test()` title.

```ts
import { test } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";

const cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
  { input: 3, expected: 6 },
];

for (const { input, expected } of cases) {
  test(`doubles ${input} to ${expected}`, async ({ page }, testInfo) => {
    story.init(testInfo);
    given(`the input is ${input}`);
    when("the doubler runs");
    then(`the result is ${expected}`);
    // ... assertions
  });
}
```

Each iteration produces a separate scenario in the generated report. Use interpolated titles so each scenario has a distinct, descriptive name.

Note: Playwright does not have `it.each` — use a `for...of` loop instead.
