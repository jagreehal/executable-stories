---
title: Vitest story & doc API
description: story(), steps, StoryOptions, and doc API for vitest-executable-stories
---

Vitest exposes **`story`** and a **callback API**: step functions exist only on the `steps` argument (no top-level `then` to avoid thenable issues). Use `steps.given`, `steps.when`, `steps.then`, `steps.and`, `steps.but`, and `steps.doc`.

## story(title, [options], define)

Registers a scenario (describe block) and its steps as Vitest tests.

| Item | Description |
|------|-------------|
| **What it is** | A describe block with story metadata; each step is registered as an `it()`. |
| **Default** | — |
| **Example** | `story("User logs in", (s) => { s.given("..."); s.when("..."); s.then("..."); });` |

**Overloads:**

- `story(title: string, define: (steps: StepsApi) => void)`
- `story(title: string, options: StoryOptions, define: (steps: StepsApi) => void)`

### StoryOptions

| Option | Type | Default | Description |
|--------|------|--------|-------------|
| `tags` | `string[]` | — | Tags for filtering and categorizing (e.g. `["smoke", "auth"]`). |
| `ticket` | `string \| string[]` | — | Ticket/issue reference(s) for requirements traceability. |
| `meta` | `Record<string, unknown>` | — | Arbitrary user-defined metadata. |

**Example:**

```typescript
story("Login works", { tags: ["smoke", "auth"], ticket: "JIRA-123" }, (steps) => {
  steps.given("the user is on the login page");
  steps.when("the user logs in with valid credentials");
  steps.then("the user should be logged in");
});
```

## Steps API (callback argument)

The callback receives a `steps` object (or `s`) with:

### BDD keywords

| Method | Renders as | Description |
|--------|------------|-------------|
| `steps.given(text, fn?)` | Given / And | First given → "Given"; subsequent in same story → "And". |
| `steps.when(text, fn?)` | When / And | Same auto-And rule for repeated when. |
| `steps.then(text, fn?)` | Then / And | Same for then. |
| `steps.and(text, fn?)` | And | Always "And" (never auto-converted). |
| `steps.but(text, fn?)` | But | Always "But" (negative intent). |

### AAA and other aliases

| Alias | Maps to |
|-------|---------|
| `arrange`, `setup`, `context` | given |
| `act`, `execute`, `action` | when |
| `assert`, `verify` | then |

### Step modifiers

Each step function has Vitest modifiers: `.skip`, `.only`, `.todo`, `.fails`, `.concurrent`.

**Example:**

```typescript
steps.given("setup", () => {});
steps.given.skip("skipped precondition", () => {});
steps.then.todo("not implemented yet");
steps.then.fails("this step is expected to throw", () => { throw new Error(""); });
```

## doc (rich documentation)

Attach tables, code blocks, notes, and more to steps. Use `steps.doc` inside a story.

### Static doc methods (registration time)

| Method | Description | Example |
|--------|-------------|---------|
| `doc.note(text)` | Add a note (e.g. "But guest checkout is enabled"). | `steps.doc.note("But guest checkout is enabled");` |
| `doc.tag(names)` | Add tag(s). | `steps.doc.tag(["wip"]);` |
| `doc.kv(label, value)` | Key-value (label + value). | `steps.doc.kv("Version", "1.0");` |
| `doc.code(label, content, lang?)` | Code block. | `steps.doc.code("Invoice", "<xml>...</xml>", "xml");` |
| `doc.json(label, value)` | JSON block (stringified). | `steps.doc.json("Payload", { id: 1 });` |
| `doc.table(label, columns, rows)` | Markdown table. | `steps.doc.table("Users", ["email"], [["a@x.com"]]);` |
| `doc.link(label, url)` | Link. | `steps.doc.link("Spec", "https://...");` |
| `doc.section(title, markdown)` | Section with raw markdown. | `steps.doc.section("Notes", "**Bold**");` |
| `doc.mermaid(code, title?)` | Mermaid diagram. | `steps.doc.mermaid("graph LR; A-->B");` |
| `doc.screenshot(path, alt?)` | Screenshot reference. | `steps.doc.screenshot("screen.png");` |
| `doc.custom(type, data)` | Custom entry (use `customRenderers` in reporter). | `steps.doc.custom("myType", data);` |

### doc.runtime (during step execution)

Same methods (`note`, `tag`, `kv`, `code`, `json`, `mermaid`, `screenshot`, `custom`) are available on `steps.doc.runtime` and run when the step executes (e.g. to capture dynamic values).

### doc.story(title, ...) — framework-native test

Attach story metadata to a plain `it()` without using `story()`:

```typescript
import { it } from "vitest";
import { doc } from "vitest-executable-stories";

it("adds two numbers", ({ task }) => {
  doc.story("Calculator adds", (s) => {
    s.given("numbers 2 and 3");
    s.when("they are added");
    s.then("the result is 5");
  });
  expect(2 + 3).toBe(5);
});
```

## Using steps from vitest-executable-stories/steps

You can destructure step functions and use them inside `story()` without the callback argument:

```typescript
import { story } from "vitest-executable-stories";
import { given, when, then } from "vitest-executable-stories/steps";

story("Calculator adds", () => {
  given("two numbers 5 and 3", () => {});
  when("the numbers are added", () => {});
  then("the result is 8", () => {});
});
```

Import from **`vitest-executable-stories/steps`**: `given`, `when`, `and`, `but`, `arrange`, `act`, `assert` (alias for then), `doc`, etc. The package does not export a top-level `then` (to avoid thenable issues); use `assert` for the then step when using the destructured steps.
