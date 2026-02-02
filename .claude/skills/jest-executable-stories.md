---
name: jest-executable-stories
description: Write Given/When/Then story tests for Jest with automatic Markdown doc generation. Use when creating BDD-style tests, converting existing tests to story format, or generating user story documentation from tests.
version: 1.0.0
libraries: ["jest"]
---

# jest-executable-stories

TypeScript-first story testing for Jest. Tests and documentation from the same code.

## Quick Start

```ts
import { story, given, when, then } from "jest-executable-stories";
import { expect } from "@jest/globals";

story("User logs in", () => {
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

## Import Style

Jest uses top-level exports for all step functions:

```ts
import { story, given, when, then, and, but, doc } from "jest-executable-stories";
```

**`doc.runtime.*` Context Limitation**

When using `doc.runtime.*` inside step callbacks, the context must be available. If you encounter context errors, use the callback pattern:

```ts
// If top-level doc.runtime fails, use callback pattern
story("Example", (s) => {
  s.given("step", () => {
    s.doc.runtime.kv("Key", value); // Works
  });
});
```

## Core Pattern

- `story()` wraps `describe()` with story metadata
- `given/when/then` are `test()` cases with keyword labels
- Each step is a real Jest test
- Reporter generates Markdown from test results

## API Reference

### story(title, define)

```ts
story("Title", () => {
  // steps here using top-level given, when, then, and, doc
});
```

### story(title, options, define)

```ts
story("Title", { tags: ["smoke"], ticket: "JIRA-123", meta: { priority: "high" } }, () => {
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

### Step Modifiers

| Modifier | Purpose |
|----------|---------|
| `.skip` | Skip step |
| `.only` | Focus mode (run only this step) |
| `.todo` | Placeholder (no callback required) |
| `.fails` | Expected failure |

**Note:** Jest does NOT support `.concurrent` for steps (unlike Vitest).

```ts
given.skip("not implemented yet");           // Skip step
when.only("debug this", () => {});           // Focus mode
then.todo("will add assertion");             // Placeholder (no callback)
then.fails("expected to fail", () => {});    // Expected failure
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

```ts
story.skip("Future feature", () => {
  // Entire story skipped but documented
});

story.only("Debug this one", () => {
  // Only this story runs
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
import { story, given, doc } from "jest-executable-stories";

story("Example", () => {
  given("precondition", () => {});
  doc.note("This note appears in docs");
  doc.kv("User", "admin@example.com");
  doc.code("Config", "{ setting: true }", "json");
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
import { story, when, doc } from "jest-executable-stories";

story("Example", () => {
  when("action", async () => {
    const result = await doAction();
    doc.runtime.kv("Result", result);      // Captures actual value
    doc.runtime.code("Response", JSON.stringify(result));
    doc.runtime.note("Captured at runtime");
  });
});
```

## Reporter Setup

```ts
// jest.config.ts
export default {
  reporters: [
    "default",
    ["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]
  ],
};
```

### Reporter Options

```ts
["jest-executable-stories/reporter", {
  output: "docs/user-stories.md",           // Single file
  // OR colocated:
  output: [{ include: "**/*.story.test.ts", mode: "colocated" }],
  title: "User Stories",
  groupBy: "file",                          // "file" | "none"
  includeStatus: true,                      // Show ✅❌⏩📝
  markdown: "gfm",                          // "gfm" | "commonmark" | "confluence"
}]
```

## Hook Behavior Warning

In the story model, each step is a separate test. This means `beforeEach` runs before EACH step, not each story.

```ts
// WRONG - hooks run per step, not per story
describe("Stories", () => {
  let value = 0;
  beforeEach(() => { value = 42; });

  story("Example", () => {
    given("check value", () => {
      // value might be 42 or 0 depending on step order
    });
  });
});

// CORRECT - use local variables within story callback
story("Example", () => {
  let value = 42; // Scoped to story

  given("check value", () => {
    expect(value).toBe(42);
  });
});
```

## Converting Existing Tests

### Before (standard Jest)

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

### After (jest-executable-stories)

```ts
import { story, given, when, then } from "jest-executable-stories";
import { expect } from "@jest/globals";

story("User logs in with valid credentials", () => {
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

- MUST: Use `expect` from `@jest/globals` for assertions
- MUST: Keep step descriptions in natural language
- SHOULD: Use present tense for step descriptions
- SHOULD: One logical action per step
- NEVER: Put assertions in `given` steps
- NEVER: Put setup in `then` steps

## Metadata Storage

Jest-executable-stories writes metadata to `.jest-executable-stories/` during test runs. The reporter reads this to generate documentation.

- SHOULD: Add `.jest-executable-stories/` to `.gitignore`

## Generated Output

```markdown
### ✅ User logs in with valid credentials

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```
