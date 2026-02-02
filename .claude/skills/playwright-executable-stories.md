---
name: playwright-executable-stories
description: Write Given/When/Then scenario tests for Playwright with automatic Markdown doc generation. Use when creating BDD-style E2E tests, converting existing Playwright tests to scenario format, or generating user story documentation from browser tests.
version: 1.0.0
libraries: ["@playwright/test"]
---

# playwright-executable-stories

TypeScript-first scenario testing for Playwright. Tests and documentation from the same code.

## Quick Start

```ts
import { scenario } from "playwright-executable-stories";
import { expect } from "@playwright/test";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async ({ page }) => {
    await page.goto("/login");
  });
  when("user submits valid credentials", async ({ page }) => {
    await page.fill("[name=email]", "user@example.com");
    await page.click("button[type=submit]");
  });
  then("user sees the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Core Pattern

- `scenario()` wraps `test.describe()` with story metadata
- `given/when/then` are `test()` cases with keyword labels
- Each step is a real Playwright test with fixtures
- Reporter generates Markdown from test annotations

## API Reference

### scenario(title, define)

```ts
scenario("Title", ({ given, when, then, and, doc }) => {
  // steps here
});
```

### scenario(title, options, define)

```ts
scenario("Title", { tags: ["smoke"], ticket: "JIRA-123", meta: { priority: "high" } }, ({ given, when, then }) => {
  // steps here
});
```

### Step Functions

| Function | Purpose |
|----------|---------|
| `given(text, fn)` | Precondition (Given) |
| `when(text, fn)` | Action (When) |
| `then(text, fn)` | Assertion (Then) |
| `and(text, fn)` | Continuation (And) |

**Step callbacks receive Playwright fixtures:**

```ts
given("user is logged in", async ({ page, context, request }) => {
  // Access any Playwright fixture
});
```

### Step Modifiers

```ts
given.skip("not implemented yet");                    // Skip step
when.only("debug this", async ({ page }) => {});      // Focus mode
then.todo("will add assertion");                      // Placeholder
then.fail("expected to fail", async ({ page }) => {}); // Expected failure
then.slow("heavy operation", async ({ page }) => {}); // 3x timeout
then.fixme("broken test");                            // Won't run
```

### AAA Pattern Aliases

| Alias | Maps to |
|-------|---------|
| `arrange` | given |
| `act` | when |
| `assert` | then |
| `setup` | given |
| `context` | given |
| `execute` | when |
| `action` | when |
| `verify` | then |

### Scenario Modifiers

```ts
scenario.skip("Future feature", ({ given, when, then }) => {
  // Entire scenario skipped but documented
});

scenario.only("Debug this one", ({ given, when, then }) => {
  // Only this scenario runs
});

scenario.fixme("Broken scenario", ({ given, when, then }) => {
  // All steps skipped
});

scenario.slow("Slow scenario", ({ given, when, then }) => {
  // Extended timeout for all steps
});
```

## Doc API

Attach documentation to steps. Static docs work for skipped steps; runtime docs capture execution values.

### Static Docs (after step declaration)

```ts
scenario("Example", ({ given, when, then, doc }) => {
  given("precondition", async ({ page }) => {});
  doc.note("This note appears in docs");
  doc.kv("User", "admin@example.com");
  doc.code("Config", { setting: true });
  doc.json("Response", { status: "ok" });
  doc.table("Matrix", ["Browser", "Status"], [["Chrome", "Pass"]]);
  doc.link("Docs", "https://example.com");
  doc.section("Notes", "- Item 1\n- Item 2");
  doc.mermaid("graph LR\n  A-->B", "Flow");
  doc.screenshot("path/to/image.png", "Login form");
});
```

### Runtime Docs (inside step body)

```ts
when("action", async ({ page }) => {
  const response = await page.request.post("/api");
  const data = await response.json();
  doc.runtime.kv("Status", response.status());
  doc.runtime.code("Response", data);
  doc.runtime.screenshot("screenshots/result.png");
});
```

## Reporter Setup

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  reporter: [
    ["list"],
    ["playwright-executable-stories/reporter", { output: "docs/user-stories.md" }],
  ],
  use: { ...devices["Desktop Chrome"] },
});
```

### Reporter Options

```ts
["playwright-executable-stories/reporter", {
  output: "docs/user-stories.md",           // Single file
  // OR colocated:
  output: [{ include: "**/*.story.spec.ts", mode: "colocated" }],
  title: "User Stories",
  groupBy: "file",                          // "file" | "none"
  includeStatus: true,                      // Show ✅❌⏩📝
  markdown: "gfm",                          // "gfm" | "commonmark" | "confluence"
  enableGithubActionsSummary: true,         // Append to GH Actions summary
  permalinkBaseUrl: undefined,              // Auto-detected in GitHub Actions
  ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
}]
```

## Converting Existing Tests

### Before (standard Playwright)

```ts
import { test, expect } from "@playwright/test";

test.describe("User authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "user@example.com");
    await page.fill('[name="password"]', "secret");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

### After (playwright-executable-stories)

```ts
import { scenario } from "playwright-executable-stories";
import { expect } from "@playwright/test";

scenario("User logs in with valid credentials", ({ given, when, then }) => {
  given("user is on login page", async ({ page }) => {
    await page.goto("/login");
  });

  when("user submits valid credentials", async ({ page }) => {
    await page.fill('[name="email"]', "user@example.com");
    await page.fill('[name="password"]', "secret");
    await page.click('button[type="submit"]');
  });

  then("user sees the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## File Naming

- SHOULD: Use `.story.spec.ts` suffix for story tests
- SHOULD: Place related scenarios in same file
- MAY: Mix regular tests and scenarios in same project

## Best Practices

- MUST: Use `expect` from `@playwright/test` for assertions
- MUST: Keep step descriptions in natural language
- MUST: Always `await` Playwright actions
- SHOULD: Use present tense for step descriptions
- SHOULD: One logical action per step
- SHOULD: Use `doc.runtime.screenshot()` to capture test screenshots in docs
- NEVER: Put assertions in `given` steps
- NEVER: Put setup in `then` steps

## Playwright-Specific Features

### Using Fixtures

All Playwright fixtures are available in step callbacks:

```ts
scenario("API test", ({ given, when, then }) => {
  given("API is ready", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();
  });
});
```

### Multiple Contexts

```ts
scenario("Multi-user flow", ({ given, when, then }) => {
  given("two users are logged in", async ({ browser }) => {
    const user1 = await browser.newContext();
    const user2 = await browser.newContext();
    // ...
  });
});
```

## GitHub Actions Integration

When running in GitHub Actions, the reporter:
- Auto-generates source links from `GITHUB_SHA`
- Appends report to job summary (if `@actions/core` installed)

## Generated Output

```markdown
### ✅ User logs in with valid credentials

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```
