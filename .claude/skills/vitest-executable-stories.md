---
name: executable-stories-vitest
description: Write Given/When/Then story tests for Vitest with automatic Markdown doc generation. Use when creating BDD-style tests or generating user story documentation from tests.
version: 2.0.0
libraries: ['vitest']
---

# executable-stories-vitest

TypeScript-first story testing for Vitest. Tests and documentation from the same code.

## Quick Start

```ts
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('User Authentication', () => {
  it('logs in with valid credentials', ({ task }) => {
    story.init(task);

    story.given('user is on login page');
    // setup code

    story.when('user submits valid credentials');
    // action code

    story.then('user sees the dashboard');
    expect(true).toBe(true);
  });
});
```

## API Reference

### story.init(task, options?)

Initialize a story at the start of each test. Required before using other story methods.

```ts
it('test name', ({ task }) => {
  story.init(task);
  // or with options:
  story.init(task, {
    tags: ['smoke', 'auth'],
    ticket: 'JIRA-123',
    meta: { priority: 'high' },
  });
});
```

### Step Markers

Step markers are documentation-only - they don't wrap code in callbacks.

```ts
story.given('precondition');
// setup code here - variables are naturally scoped

story.when('action occurs');
// action code here

story.then('expected result');
// assertion code here
expect(result).toBe(expected);
```

| Method              | Keyword | Purpose               |
| ------------------- | ------- | --------------------- |
| `story.given(text)` | Given   | Precondition/setup    |
| `story.when(text)`  | When    | Action                |
| `story.then(text)`  | Then    | Assertion             |
| `story.and(text)`   | And     | Continuation          |
| `story.but(text)`   | But     | Negative continuation |

### Step Aliases

```ts
// AAA Pattern
story.arrange('setup');
story.act('action');
story.assert('check');

// Alternative names
story.setup('initial state');
story.context('additional context');
story.execute('operation');
story.action('user action');
story.verify('outcome');
```

### Inline Docs

Attach documentation directly to steps:

```ts
story.given('valid credentials', {
  json: {
    label: 'Credentials',
    value: { email: 'test@example.com', password: '***' },
  },
  note: 'Password is masked for security',
});

story.when('payment is processed', {
  kv: { 'Payment ID': 'pay_123', Amount: '$99.99' },
});

story.then('order is confirmed', {
  table: {
    label: 'Order Summary',
    columns: ['Item', 'Price'],
    rows: [['Widget', '$49.99']],
  },
});
```

### Standalone Doc Methods

Call after a step to attach documentation:

```ts
story.given('an order exists');
story.json({ label: 'Order', value: { id: 123, items: ['widget'] } });

story.when('payment processed');
story.kv({ label: 'Payment ID', value: 'pay_123' });
story.kv({ label: 'Amount', value: '$99.99' });

story.then('confirmation sent');
story.screenshot({ path: '/screenshots/confirmation.png', alt: 'Email sent' });
```

| Method                      | Signature                   | Purpose          |
| --------------------------- | --------------------------- | ---------------- |
| `story.note(text)`          | `string`                    | Free text note   |
| `story.tag(names)`          | `string \| string[]`        | Tags             |
| `story.kv(options)`         | `{ label, value }`          | Key-value pair   |
| `story.json(options)`       | `{ label, value }`          | JSON code block  |
| `story.code(options)`       | `{ label, content, lang? }` | Code block       |
| `story.table(options)`      | `{ label, columns, rows }`  | Markdown table   |
| `story.link(options)`       | `{ label, url }`            | Hyperlink        |
| `story.section(options)`    | `{ title, markdown }`       | Markdown section |
| `story.mermaid(options)`    | `{ code, title? }`          | Mermaid diagram  |
| `story.screenshot(options)` | `{ path, alt? }`            | Screenshot       |
| `story.custom(options)`     | `{ type, data }`            | Custom entry     |

### Story-Level Docs

Docs called before any step attach to the story level:

```ts
it('complex workflow', ({ task }) => {
  story.init(task);

  // These attach to story level (before steps)
  story.note('Requires running database');
  story.link({ label: 'API Docs', url: 'https://docs.example.com' });

  story.given('database is seeded');
  // ...
});
```

## Using beforeEach

```ts
describe('User Profile', () => {
  beforeEach(({ task }) => {
    story.init(task);
    story.given('user is logged in');
  });

  it('updates email', () => {
    story.when('user changes email');
    story.then('email is updated');
  });

  it('updates password', () => {
    story.when('user changes password');
    story.then('password is updated');
  });
});
```

## Test Modifiers

Use native Vitest modifiers - they work seamlessly:

```ts
it.skip('not implemented yet', ({ task }) => {
  story.init(task);
  // ...
});

it.todo('will add later');

it.only('debug this', ({ task }) => {
  story.init(task);
  // ...
});
```

## Reporter Setup

```ts
// vitest.config.ts
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', new StoryReporter()],
  },
});
```

### Reporter Options

```ts
new StoryReporter({
  // Output format selection
  formats: ['markdown'], // "markdown" | "html" | "junit" | "cucumber-json"
  outputDir: 'docs', // Output directory
  outputName: 'user-stories', // Base filename (produces user-stories.md)

  // Output routing
  output: {
    mode: 'aggregated', // "aggregated" | "colocated"
    // colocatedStyle: "mirrored",          // "mirrored" | "adjacent" (when mode: "colocated")
  },

  // Markdown-specific options
  markdown: {
    title: 'User Stories',
    sortScenarios: 'source', // "alpha" | "source"
    suiteSeparator: ' - ',
    includeStatusIcons: true, // Show ✅❌⏩📝
    includeErrors: true, // Show failure details
    includeMetadata: true, // Show date/version/git SHA
  },
});
```

## Generated Output

```markdown
## Calculator

### ✅ adds two numbers

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8

### ❌ divides by zero

- **Given** a number 10 and zero
  > Division by zero should throw an error
- **When** division is attempted
- **Then** an error is thrown

**Failure**

    Error: Cannot divide by zero
```

## Converting from callback API

### Before (callback API)

```ts
import { story } from 'executable-stories-vitest';

story('User logs in', (s) => {
  let result;

  s.given('valid credentials', () => {
    // setup
  });

  s.when('submits login', () => {
    result = login();
  });

  s.then('sees dashboard', () => {
    expect(result.ok).toBe(true);
  });
});
```

### After (native describe/it)

```ts
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('Authentication', () => {
  it('User logs in', ({ task }) => {
    story.init(task);

    story.given('valid credentials');
    // setup - variables naturally scoped

    story.when('submits login');
    const result = login();

    story.then('sees dashboard');
    expect(result.ok).toBe(true);
  });
});
```

## Best Practices

- MUST call `story.init(task)` at the start of each test
- MUST use native Vitest `describe`/`it` for full IDE support
- SHOULD use `.story.test.ts` suffix for story tests
- SHOULD keep step descriptions in natural language
- NEVER put assertions in `given` steps
- NEVER put setup in `then` steps

## Project context

Repo conventions, ESLint plugins, and verification: see **AGENTS.md** (and **CLAUDE.md** symlink) in the repo root. The Vitest package does **not** export top-level `given`/`when`/`then` (use `story.init(task)` then `story.given`/`story.when`/`story.then`) to avoid thenable issues with dynamic imports.
