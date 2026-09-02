---
name: playwright-converting-tests
description: >
  Use when incrementally adopting executable-stories in an existing
  Playwright test suite, converting spec blocks to story tests, or adding
  story.init(testInfo) without a full rewrite. Progressive enhancement of
  .story.spec.ts files.
metadata:
  type: lifecycle
  library: executable-stories-playwright
  library_version: "8.10.1"
  requires:
    - playwright-story-api
  sources:
    - "jagreehal/executable-stories:apps/docs-site/src/content/docs/guides/converting-playwright.md"
---

This skill builds on playwright-story-api. Read playwright-story-api first.

# Converting Existing Playwright Tests

## Setup

Install the packages and configure the reporter:

```bash
npm install -D executable-stories-playwright executable-stories-formatters
```

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"],
    ["executable-stories-playwright/reporter", { formats: ["markdown"] }],
  ],
});
```

## Core Patterns

### Step 1: Rename the file

```
# Before
tests/login.spec.ts

# After
tests/login.story.spec.ts
```

### Step 2: Add story.init() and step markers

```typescript
// Before
import { test, expect } from "@playwright/test";

test("logs in successfully", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.fill("#password", "secret");
  await page.click("#submit");
  await expect(page.locator("h1")).toHaveText("Dashboard");
});
```

```typescript
// After
import { test, expect } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";

test("logs in successfully", async ({ page }, testInfo) => {
  story.init(testInfo);

  given("the login page is loaded");
  await page.goto("/login");

  when("valid credentials are entered");
  await page.fill("#email", "user@example.com");
  await page.fill("#password", "secret");
  await page.click("#submit");

  then("the dashboard is shown");
  await expect(page.locator("h1")).toHaveText("Dashboard");
});
```

Key change: add `testInfo` as the second parameter in the test callback.

### Step 3: Minimal story

```typescript
test("loads homepage", async ({ page }, testInfo) => {
  story.init(testInfo);
  await page.goto("/");
  await expect(page).toHaveTitle("My App");
});
```

### Step 4: Add doc entries

```typescript
test("shows product details", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["e2e", "products"] });

  given("the product page is loaded");
  await page.goto("/products/123");

  then("the product details are shown");
  story.screenshot({ page, alt: "Product page" });
  story.json({ label: "Product", value: { id: 123, name: "Widget" } });
});
```

### Suite headings from test.describe

```typescript
test.describe("Authentication", () => {
  test("valid login", async ({ page }, testInfo) => {
    story.init(testInfo);
    // "Authentication" becomes a ## heading in docs
  });
});
```

## Common Mistakes

### HIGH Using .story.test.ts instead of .story.spec.ts

Wrong: `tests/login.story.test.ts`
Correct: `tests/login.story.spec.ts`

Playwright convention uses `.spec.ts`. The reporter filters accordingly.

Source: CLAUDE.md — file naming conventions

### HIGH Forgetting testInfo parameter

Wrong:

```typescript
test("my test", async ({ page }) => {
  story.init();  // No testInfo
});
```

Correct:

```typescript
test("my test", async ({ page }, testInfo) => {
  story.init(testInfo);
});
```

`testInfo` is the second parameter of Playwright's test callback. Without it, story metadata is not linked to the test.

Source: packages/executable-stories-playwright/src/story-api.ts
