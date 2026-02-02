---
name: vitest-executable-stories
description: Write Given/When/Then scenario tests for Vitest with automatic Markdown doc generation. Use when creating BDD-style tests, converting existing tests to scenario format, or generating user story documentation from tests.
version: 1.0.0
libraries: ["vitest"]
---

# vitest-executable-stories

TypeScript-first scenario testing for Vitest. Tests and documentation from the same code.

## Quick Start

```ts
import { scenario } from "vitest-executable-stories";
import { expect } from "vitest";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", () => {
    // setup
  });
  when("user submits valid credentials", () => {
    // action
  });
  then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
```

## Core Pattern

- `scenario()` wraps `describe()` with story metadata
- `given/when/then` are `it()` tests with keyword labels
- Each step is a real Vitest test
- Reporter generates Markdown from test results

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

### Step Modifiers

```ts
given.skip("not implemented yet");           // Skip step
when.only("debug this", () => {});           // Focus mode
then.todo("will add assertion");             // Placeholder
then.fails("expected to fail", () => {});    // Expected failure
when.concurrent("parallel step", () => {});  // Run in parallel
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
```

## Doc API

Attach documentation to steps. Static docs work for skipped steps; runtime docs capture execution values.

### Static Docs (after step declaration)

```ts
scenario("Example", ({ given, when, then, doc }) => {
  given("precondition", () => {});
  doc.note("This note appears in docs");
  doc.kv("User", "admin@example.com");
  doc.code("Config", { setting: true });
  doc.json("Response", { status: "ok" });
  doc.table("Matrix", ["Browser", "Status"], [["Chrome", "Pass"]]);
  doc.link("Docs", "https://example.com");
  doc.section("Notes", "- Item 1\n- Item 2");
  doc.mermaid("graph LR\n  A-->B");
  doc.screenshot("path/to/image.png", "alt text");
});
```

### Runtime Docs (inside step body)

```ts
when("action", async () => {
  const result = await doAction();
  doc.runtime.kv("Result", result);      // Captures actual value
  doc.runtime.code("Response", result);
  doc.runtime.note("Captured at runtime");
});
```

## Reporter Setup

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter()],
  },
});
```

### Reporter Options

```ts
new StoryReporter({
  output: "docs/user-stories.md",           // Single file
  // OR colocated:
  output: [{ include: "**/*.story.test.ts", mode: "colocated" }],
  title: "User Stories",
  groupBy: "file",                          // "file" | "none"
  includeStatus: true,                      // Show ✅❌⏩📝
  markdown: "gfm",                          // "gfm" | "commonmark" | "confluence"
})
```

## Converting Existing Tests

### Before (standard Vitest)

```ts
describe("User authentication", () => {
  it("should login with valid credentials", async () => {
    const page = await createPage();
    await page.goto("/login");
    await page.fill('[name="email"]', "user@example.com");
    await page.click('button[type="submit"]');
    expect(page.url()).toContain("/dashboard");
  });
});
```

### After (vitest-executable-stories)

```ts
import { scenario } from "vitest-executable-stories";

scenario("User logs in with valid credentials", ({ given, when, then }) => {
  let page: Page;

  given("user is on login page", async () => {
    page = await createPage();
    await page.goto("/login");
  });

  when("user submits valid credentials", async () => {
    await page.fill('[name="email"]', "user@example.com");
    await page.click('button[type="submit"]');
  });

  then("user sees the dashboard", () => {
    expect(page.url()).toContain("/dashboard");
  });
});
```

## File Naming

- SHOULD: Use `.story.test.ts` suffix for story tests
- SHOULD: Place related scenarios in same file
- MAY: Mix regular tests and scenarios in same project

## Best Practices

- MUST: Use `expect` from `vitest` for assertions
- MUST: Keep step descriptions in natural language
- SHOULD: Use present tense for step descriptions
- SHOULD: One logical action per step
- NEVER: Put assertions in `given` steps
- NEVER: Put setup in `then` steps

## Generated Output

```markdown
### ✅ User logs in with valid credentials

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```
