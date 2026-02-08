---
title: Vitest story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc methods for executable-stories-vitest
---

Vitest uses a **native describe/it** pattern: you call **`story.init(task)`** at the start of each test, then use **`story.given`**, **`story.when`**, **`story.then`**, and doc methods on the **`story`** object. There is no callback-based `story(title, define)` and no top-level `then` export (to avoid thenable issues).

## story.init(task, [options])

Initializes a story for the current test. Must be called at the start of each test that wants documentation.

| Item        | Description                                                                            |
| ----------- | -------------------------------------------------------------------------------------- |
| **task**    | The Vitest task from `it('...', ({ task }) => { ... })`.                               |
| **options** | Optional `StoryOptions`: `tags`, `ticket`, `meta`.                                     |
| **Example** | `it('adds two numbers', ({ task }) => { story.init(task); story.given('...'); ... });` |

**Example with options:**

```typescript
it('admin deletes user', ({ task }) => {
  story.init(task, {
    tags: ['admin', 'destructive'],
    ticket: 'JIRA-456',
  });
  story.given('the admin is logged in');
  story.when('the admin deletes the user');
  story.then('the user is removed');
});
```

## Step markers (story.given, story.when, story.then, story.and, story.but)

Use the **`story`** object to mark steps. Each step can take optional inline docs as a second argument.

| Method                     | Renders as  | Description                                              |
| -------------------------- | ----------- | -------------------------------------------------------- |
| `story.given(text, docs?)` | Given / And | First given → "Given"; subsequent in same story → "And". |
| `story.when(text, docs?)`  | When / And  | Same auto-And rule for repeated when.                    |
| `story.then(text, docs?)`  | Then / And  | Same for then.                                           |
| `story.and(text, docs?)`   | And         | Always "And" (never auto-converted).                     |
| `story.but(text, docs?)`   | But         | Always "But" (negative intent).                          |

**Keyword resolution:** The first `given` in a story renders as "Given"; any further `given` in the same story renders as "And". The same rule applies to repeated `when` and `then`. Using **`story.and()`** or **`story.but()`** explicitly never changes: **and** always renders "And", **but** always renders "But" (for negative or contrasting intent).

**Example:**

```typescript
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('Calculator', () => {
  it('adds two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 5 and 3');
    const a = 5,
      b = 3;

    story.when('I add them together');
    const result = a + b;

    story.then('the result is 8');
    expect(result).toBe(8);
  });
});
```

### Inline docs on steps (second argument)

Pass a **`StoryDocs`** object as the second argument to any step to attach notes, JSON, tables, etc. to that step:

```typescript
story.given('valid credentials', {
  json: {
    label: 'Credentials',
    value: { email: 'test@example.com', password: '***' },
  },
  note: 'Password is masked for security',
});
story.then('the user is logged in', {
  table: {
    label: 'Session',
    columns: ['key', 'value'],
    rows: [['userId', '123']],
  },
});
```

Supported keys: `note`, `tag`, `kv`, `code`, `json`, `table`, `link`, `section`, `mermaid`, `screenshot`, `custom`. Same shapes as the standalone doc methods below.

## AAA and other aliases

| Alias                                           | Maps to |
| ----------------------------------------------- | ------- |
| `story.arrange`, `story.setup`, `story.context` | given   |
| `story.act`, `story.execute`, `story.action`    | when    |
| `story.assert`, `story.verify`                  | then    |

## Doc methods (standalone)

Attach rich documentation to the **current step** (or story-level if called before any step). All take an options object except `note` and `tag`.

| Method                      | Description                                       | Example                                                                     |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `story.note(text)`          | Free-text note.                                   | `story.note("But guest checkout is enabled");`                              |
| `story.tag(name \| names)`  | Tag(s).                                           | `story.tag(["wip"]);`                                                       |
| `story.kv(options)`         | Key-value.                                        | `story.kv({ label: "Version", value: "1.0" });`                             |
| `story.code(options)`       | Code block.                                       | `story.code({ label: "Invoice", content: "<xml>...</xml>", lang: "xml" });` |
| `story.json(options)`       | JSON block.                                       | `story.json({ label: "Payload", value: { id: 1 } });`                       |
| `story.table(options)`      | Markdown table.                                   | `story.table({ label: "Users", columns: ["email"], rows: [["a@x.com"]] });` |
| `story.link(options)`       | Link.                                             | `story.link({ label: "Spec", url: "https://..." });`                        |
| `story.section(options)`    | Section with markdown.                            | `story.section({ title: "Notes", markdown: "**Bold**" });`                  |
| `story.mermaid(options)`    | Mermaid diagram.                                  | `story.mermaid({ code: "graph LR; A-->B" });`                               |
| `story.screenshot(options)` | Screenshot reference.                             | `story.screenshot({ path: "screen.png" });`                                 |
| `story.custom(options)`     | Custom entry (use `customRenderers` in reporter). | `story.custom({ type: "myType", data });`                                   |

**Example:**

```typescript
it('login with credentials', ({ task }) => {
  story.init(task);
  story.given('the user has valid credentials');
  story.note('Credentials are loaded from fixtures.');
  story.when('the user submits the login form');
  story.json({ label: 'Request', value: { email: 'u@x.com' } });
  story.then('the user is logged in');
});
```

## StoryOptions

| Option   | Type                      | Default | Description                                                     |
| -------- | ------------------------- | ------- | --------------------------------------------------------------- |
| `tags`   | `string[]`                | —       | Tags for filtering and categorizing (e.g. `["smoke", "auth"]`). |
| `ticket` | `string \| string[]`      | —       | Ticket/issue reference(s) for requirements traceability.        |
| `meta`   | `Record<string, unknown>` | —       | Arbitrary user-defined metadata.                                |

## Reporter

Import the reporter from the **`/reporter`** subpath in your config (do not import from the main package in `vitest.config.ts`):

```typescript
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', new StoryReporter()],
  },
});
```

See [Vitest reporter options](/reference/vitest-config/) for all options.

## Types

Export from `executable-stories-vitest`: `StoryMeta`, `StoryStep`, `DocEntry`, `StepKeyword`, `StoryDocs`, `StoryOptions`, `VitestTask`, `VitestSuite`, `StepMode`, `DocPhase`, `StoryDocs`. Reporter types from `executable-stories-vitest/reporter`: `StoryReporterOptions`, `OutputRule`, `CustomDocRenderer`.
