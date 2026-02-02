---
name: vitest-executable-stories
description: Write Given/When/Then story tests for Vitest with automatic Markdown doc generation. Use when creating BDD-style tests, converting existing tests to story format, or generating user story documentation from tests.
version: 1.0.0
libraries: ["vitest"]
---

# vitest-executable-stories

TypeScript-first story testing for Vitest. Tests and documentation from the same code.

## Quick Start

```ts
import { story } from "vitest-executable-stories";
import { expect } from "vitest";

story("User logs in", (s) => {
  s.given("user is on login page", () => {
    // setup
  });
  s.when("user submits valid credentials", () => {
    // action
  });
  s.then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
```

## Import Styles

### Callback Pattern (Recommended)

Use when you need `doc.runtime.*` inside step callbacks:

```ts
import { story } from "vitest-executable-stories";

story("Example", (s) => {
  s.given("setup", () => {
    s.doc.runtime.kv("Value", 42); // Works!
  });
});
```

### Top-Level Exports

```ts
import { story, given, when, and, but, doc } from "vitest-executable-stories";

story("Example", () => {
  given("setup", () => {});
  when("action", () => {});
});
```

**Critical: `then` Export Limitation**

`then` is NOT directly exported due to conflict with `Promise.then`. Use one of these workarounds:

```ts
// Option 1: Use step object
import { step } from "vitest-executable-stories";
const { then } = step;

// Option 2: Use aliases
import { verify, assert } from "vitest-executable-stories";

// Option 3: Use callback pattern (recommended)
story("Example", (s) => {
  s.then("assertion", () => {});
});
```

**`doc.runtime.*` Context Limitation**

When using top-level exports, `doc.runtime.*` inside step callbacks will fail:

```ts
// WRONG - will fail with: _getStoryApi() must be called from inside a story() callback
import { story, given, doc } from "vitest-executable-stories";
story("Example", () => {
  given("step", () => {
    doc.runtime.kv("Key", value); // ERROR!
  });
});

// CORRECT - use callback pattern
import { story } from "vitest-executable-stories";
story("Example", (s) => {
  s.given("step", () => {
    s.doc.runtime.kv("Key", value); // Works
  });
});
```

## Core Pattern

- `story()` wraps `describe()` with story metadata
- `given/when/then` are `it()` tests with keyword labels
- Each step is a real Vitest test
- Reporter generates Markdown from test results

## API Reference

### story(title, define)

```ts
story("Title", (s) => {
  // steps here using s.given, s.when, s.then, s.and, s.doc
});
```

### story(title, options, define)

```ts
story("Title", { tags: ["smoke"], ticket: "JIRA-123", meta: { priority: "high" } }, (s) => {
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
| `.concurrent` | Parallel execution (Vitest-only) |

```ts
s.given.skip("not implemented yet");           // Skip step
s.when.only("debug this", () => {});           // Focus mode
s.then.todo("will add assertion");             // Placeholder (no callback)
s.then.fails("expected to fail", () => {});    // Expected failure
s.when.concurrent("parallel step", () => {});  // Run in parallel (Vitest-only)
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
story.skip("Future feature", (s) => {
  // Entire story skipped but documented
});

story.only("Debug this one", (s) => {
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
story("Example", (s) => {
  s.given("precondition", () => {});
  s.doc.note("This note appears in docs");
  s.doc.kv("User", "admin@example.com");
  s.doc.code("Config", "{ setting: true }", "json");
  s.doc.json("Response", { status: "ok" });
  s.doc.table("Matrix", ["Browser", "Status"], [["Chrome", "Pass"]]);
  s.doc.link("Docs", "https://example.com");
  s.doc.section("Notes", "- Item 1\n- Item 2");
  s.doc.mermaid("graph LR\n  A-->B");
  s.doc.screenshot("path/to/image.png", "alt text");
});
```

### Runtime Docs (inside step body)

**Important:** `doc.runtime.*` requires the callback pattern. It will NOT work with top-level exports.

```ts
story("Example", (s) => {
  s.when("action", async () => {
    const result = await doAction();
    s.doc.runtime.kv("Result", result);      // Captures actual value
    s.doc.runtime.code("Response", JSON.stringify(result));
    s.doc.runtime.note("Captured at runtime");
  });
});
```

## Reporter Setup

In vitest.config, always import StoryReporter from **vitest-executable-stories/reporter** (not the main package). The main entry re-exports BDD helpers that import Vitest; importing it in config can break.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

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

## Hook Behavior Warning

In the story model, each step is a separate test. This means `beforeEach` runs before EACH step, not each story.

```ts
// WRONG - hooks run per step, not per story
describe("Stories", () => {
  let value = 0;
  beforeEach(() => { value = 42; });

  story("Example", (s) => {
    s.given("check value", () => {
      // value might be 42 or 0 depending on step order
    });
  });
});

// CORRECT - use local variables within story callback
story("Example", (s) => {
  let value = 42; // Scoped to story

  s.given("check value", () => {
    expect(value).toBe(42);
  });
});
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
import { story } from "vitest-executable-stories";

story("User logs in with valid credentials", (s) => {
  let page: Page;

  s.given("user is on login page", async () => {
    page = await createPage();
    await page.goto("/login");
  });

  s.when("user submits valid credentials", async () => {
    await page.fill('[name="email"]', "user@example.com");
    await page.click('button[type="submit"]');
  });

  s.then("user sees the dashboard", () => {
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
