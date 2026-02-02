---
name: playwright-executable-stories
description: Write Given/When/Then story tests for Playwright with automatic Markdown doc generation. Use when creating BDD-style E2E tests, converting existing Playwright tests to story format, or generating user story documentation from browser tests.
version: 1.0.0
libraries: ["@playwright/test"]
---

# playwright-executable-stories

TypeScript-first story testing for Playwright. Tests and documentation from the same code.

## Quick Start

```ts
import { story } from "playwright-executable-stories";
import { expect } from "@playwright/test";

story("User logs in", ({ given, when, then }) => {
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

## Critical: All Steps are Async

Every step callback in Playwright stories should be `async` because:
- Playwright actions are async
- Playwright fixtures are available in callback

```ts
given("user is on page", async ({ page, context, browser }) => {
  await page.goto("/login");
});
```

## Page State Warning

**Page state does NOT persist across steps in the story model.** Each step is a separate test with its own browser context.

```ts
// WRONG - page state won't persist
story("Multi-step flow", ({ given, when, then }) => {
  given("user logs in", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "user@test.com");
    await page.click("button");
    // After this step, page state is lost!
  });

  then("user sees dashboard", async ({ page }) => {
    // This is a NEW page - not logged in!
    await expect(page).toHaveURL("/dashboard"); // FAILS
  });
});
```

For flows requiring persistent page state, use framework-native patterns or skip the story.

## Core Pattern

- `story()` wraps `test.describe()` with story metadata
- `given/when/then` are `test()` cases with keyword labels
- Each step is a real Playwright test with fixtures
- Reporter generates Markdown from test annotations

## API Reference

### story(title, define)

```ts
story("Title", ({ given, when, then, and, doc }) => {
  // steps here
});
```

### story(title, options, define)

```ts
story("Title", { tags: ["smoke"], ticket: "JIRA-123", meta: { priority: "high" } }, ({ given, when, then }) => {
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
| `but(text, fn)` | Continuation (But) |

**Step callbacks receive Playwright fixtures:**

```ts
given("user is logged in", async ({ page, context, request }) => {
  // Access any Playwright fixture
});
```

### Step Modifiers

| Modifier | Purpose |
|----------|---------|
| `.skip` | Skip step |
| `.only` | Focus mode (run only this step) |
| `.todo` | Placeholder (no callback required) |
| `.fixme` | Known issue - won't run (Playwright-specific) |
| `.fail` | Expected failure (Playwright-specific) |
| `.slow` | 3x timeout (Playwright-specific) |

```ts
given.skip("not implemented yet");                    // Skip step
when.only("debug this", async ({ page }) => {});      // Focus mode
then.todo("will add assertion");                      // Placeholder (no callback)
then.fixme("broken test");                            // Known issue - won't run
then.fail("expected to fail", async ({ page }) => {}); // Expected failure
then.slow("heavy operation", async ({ page }) => {}); // 3x timeout
```

### Step Aliases

| Alias | Maps to | Purpose |
|-------|---------|---------|
| `arrange` | given | AAA pattern setup |
| `act` | when | AAA pattern action |
| `assert` | then | AAA pattern assertion |
| `setup` | given | Alternative setup |
| `context` | given | State establishment |
| `execute` | when | Alternative action |
| `action` | when | Alternative action |
| `verify` | then | Alternative assertion |

### Story Modifiers

| Modifier | Purpose |
|----------|---------|
| `story.skip()` | Skip entire story |
| `story.only()` | Run only this story |
| `story.fixme()` | Entire story needs fix (Playwright-specific) |
| `story.slow()` | Extended timeout for all steps (Playwright-specific) |

```ts
story.skip("Future feature", ({ given, when, then }) => {
  // Entire story skipped but documented
});

story.only("Debug this one", ({ given, when, then }) => {
  // Only this story runs
});

story.fixme("Broken story", ({ given, when, then }) => {
  // All steps skipped - known issue
});

story.slow("Slow story", ({ given, when, then }) => {
  // Extended timeout (3x) for all steps
});
```

## Doc API

Attach documentation to steps. Static docs work for skipped steps; runtime docs capture execution values.

### Doc Methods Reference

| Method | Signature | Purpose |
|--------|-----------|---------|
| `doc.note()` | `(text: string)` | Free text notes |
| `doc.tag()` | `(tags: string \| string[])` | Categorization |
| `doc.kv()` | `(key: string, value: any)` | Key-value pairs |
| `doc.code()` | `(label: string, content: string, lang?: string)` | Code blocks |
| `doc.json()` | `(label: string, value: any)` | JSON objects |
| `doc.table()` | `(label: string, columns: string[], rows: any[][])` | Tables |
| `doc.link()` | `(label: string, url: string)` | Links |
| `doc.section()` | `(title: string, markdown: string)` | Markdown sections |
| `doc.mermaid()` | `(content: string, label?: string)` | Diagrams |
| `doc.screenshot()` | `(path: string, alt?: string)` | Screenshots |
| `doc.custom()` | `(type: string, data: any)` | Custom content |

### Static Docs (after step declaration)

```ts
story("Example", ({ given, when, then, doc }) => {
  given("precondition", async ({ page }) => {});
  doc.note("This note appears in docs");
  doc.kv("User", "admin@example.com");
  doc.code("Config", "{ setting: true }", "json");
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
  doc.runtime.code("Response", JSON.stringify(data));
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
import { story } from "playwright-executable-stories";
import { expect } from "@playwright/test";

story("User logs in with valid credentials", ({ given, when, then }) => {
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

## Hook Behavior Warning

In the story model, each step is a separate test. This means `test.beforeEach` runs before EACH step, not each story.

```ts
// WRONG - hooks run per step, not per story
test.describe("Stories", () => {
  let value = 0;
  test.beforeEach(() => { value = 42; });

  story("Example", ({ given }) => {
    given("check value", async () => {
      // value might be 42 or 0 depending on step order
    });
  });
});

// CORRECT - use local variables within story callback
story("Example", ({ given }) => {
  let value = 42; // Scoped to story

  given("check value", async () => {
    expect(value).toBe(42);
  });
});
```

## Best Practices

- MUST: Use `expect` from `@playwright/test` for assertions
- MUST: Keep step descriptions in natural language
- MUST: Always `await` Playwright actions
- MUST: Make all step callbacks `async`
- SHOULD: Use present tense for step descriptions
- SHOULD: One logical action per step
- SHOULD: Use `doc.runtime.screenshot()` to capture test screenshots in docs
- NEVER: Put assertions in `given` steps
- NEVER: Put setup in `then` steps
- NEVER: Rely on page state persisting across steps

## Playwright-Specific Features

### Using Fixtures

All Playwright fixtures are available in step callbacks:

```ts
story("API test", ({ given, when, then }) => {
  given("API is ready", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();
  });
});
```

### Multiple Contexts

```ts
story("Multi-user flow", ({ given, when, then }) => {
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
