---
name: playwright-story-api
description: >
  Write BDD stories in Playwright using executable-stories-playwright.
  Top-level exports with TestInfo: story.init(testInfo). Async steps with
  fixtures ({ page }). Steps: given, when, then, and, but. Doc entries:
  json, kv, code, table, link, section, mermaid, screenshot, note, tag.
  Auto-And keyword conversion. Aliases: arrange, act, assert.
type: core
library: executable-stories-playwright
library_version: "7.0.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-playwright/src/story-api.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/playwright/playwright-story-api.md"
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
    await page.fill("#email", "alice@example.com");
    await page.fill("#password", "secret");
    await page.click('button[type="submit"]');

    then("the dashboard is shown");
    await expect(page.locator("h1")).toHaveText("Dashboard");
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
  await page.fill("#email", "user@test.com");
  await page.click("#submit");

  then("the user sees an error message");
  await expect(page.locator(".error")).toBeVisible();

  but("the user is not logged in");           // renders "But" (always)
  await expect(page).toHaveURL("/login");
});
```

### Doc entries with screenshots

```typescript
test("checkout flow", async ({ page }, testInfo) => {
  story.init(testInfo);

  given("a cart with items");
  story.json({ label: "Cart", value: { items: 3, total: 150 } });

  when("the user completes checkout");
  await page.click("#checkout");
  await page.waitForURL("/confirmation");

  then("the confirmation page is shown");
  story.screenshot({ path: "screenshots/confirmation.png", alt: "Order confirmation" });
  story.table({
    label: "Order details",
    columns: ["Item", "Qty", "Price"],
    rows: [["Widget", "3", "$50"]],
  });
});
```

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

Use Playwright's data-driven pattern with `story()` to produce one scenario per data row — the framework-native replacement for Cucumber's Scenario Outline + Examples.

```ts
import { test } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";

const cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
  { input: 3, expected: 6 },
];

for (const { input, expected } of cases) {
  test(`doubles ${input} to ${expected}`, async ({ page }) => {
    story(`Doubles ${input} to ${expected}`);
    given(`the input is ${input}`);
    when("the doubler runs");
    then(`the result is ${expected}`);
    // ... assertions
  });
}
```

Each iteration produces a separate scenario in the generated report. Use interpolated titles so each scenario has a distinct, descriptive name.

Note: Playwright does not have `it.each` — use a `for...of` loop instead.
