# executable-stories-vitest

BDD-style executable stories for Vitest with Markdown and HTML documentation generation. Uses Vitest’s native `describe` / `it`; step markers and optional callbacks register scenario metadata for the reporter.

## Install

```bash
pnpm add -D executable-stories-vitest executable-stories-formatters
```

## Getting started

### 1. Add the reporter

In `vitest.config.ts`, add `createStoryReporter` from the **reporter** subpath:

```ts
import { defineConfig } from 'vitest/config';
import { createStoryReporter } from 'executable-stories-vitest/reporter';

export default defineConfig({
  test: {
    reporters: ['default', createStoryReporter()],
  },
});
```

You can pass [reporter options](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters) (e.g. `formats: ['markdown', 'html']`, `outputDir`, `outputName`) as the first argument to `createStoryReporter({ ... })`.

### 2. Call `story.init(task)` in each test

Vitest passes a `task` in the test context. Call `story.init(task)` at the start of any test that should be documented (and optionally pass `{ tags }` or other [StoryOptions](#story-options)):

```ts
import { describe, it, expect } from 'vitest';
import { story } from 'executable-stories-vitest';

describe('Calculator', () => {
  it('adds two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers 5 and 3');
    const a = 5;
    const b = 3;

    story.when('I add them together');
    const result = a + b;

    story.then('the result is 8');
    expect(result).toBe(8);
  });
});
```

### 3. Run tests and open the generated report

After `pnpm test` (or `vitest run`), the reporter writes output to the configured `outputDir` (e.g. Markdown and/or HTML). Open the generated files to see scenario titles, steps, and status.

---

## Two step styles

You can use steps in two ways in the same project (and in the same file).

### Marker-only (code after the marker)

Step text documents intent; implementation lives on the following lines. No callback. Works for both sync and async tests: use `await` in the lines after the marker.

```ts
it('adds two numbers', ({ task }) => {
  story.init(task);

  story.given('two numbers 5 and 3');
  const a = 5;
  const b = 3;

  story.when('I add them together');
  const result = a + b;

  story.then('the result is 8');
  expect(result).toBe(8);
});
```

Async example:

```ts
it('fetches and validates', async ({ task }) => {
  story.init(task);

  story.given('the API is available');
  const client = createApiClient();

  story.when('I request the summary');
  const data = await client.getSummary();

  story.then('the response contains the expected fields');
  expect(data).toHaveProperty('version');
});
```

### Optional callback (code inside the step)

Pass a function as the second argument to `given` / `when` / `then` / `and` / `but`. The step is recorded, then the function is run. If the function returns a `Promise`, that promise is returned so you can `await story.when('...', async () => { ... })`.

```ts
it('indexes the diagram', async ({ task }) => {
  story.init(task);

  story.given('a diagram container', () => {
    container = document.createElement('div');
    container.appendChild(createMockDiagram());
  });

  const result = await story.when('I call ready()', async () => {
    player = createFlowPlayer({ root: container });
    await player.ready();
    return player.getState();
  });

  story.then('the diagram is indexed', () => {
    expect(result.indexed).toBe(true);
  });
});
```

You can mix both styles in one test: some steps with only text, others with a callback. When a callback is used, its return value (including a Promise) is returned from the step call.

---

## Story options

Pass options as the second argument to `story.init(task, options)`:

| Option               | Description |
| -------------------- | ----------- |
| `tags`               | String array for categorization and filtering (e.g. `['smoke', 'auth']`). |
| `ticket`             | Ticket/issue ID(s) for traceability (e.g. `'JIRA-123'` or `['JIRA-123', 'JIRA-456']`). |
| `meta`               | Arbitrary key-value metadata. |
| `traceUrlTemplate`   | URL template for OTel trace links; use `{traceId}` placeholder. Can also be set via `OTEL_TRACE_URL_TEMPLATE`. |

Example:

```ts
story.init(task, {
  tags: ['admin', 'destructive'],
  ticket: 'JIRA-456',
});
```

---

## Developer experience

- **API:** Steps are on the `story` object: `story.given`, `story.when`, `story.then`, `story.and`, `story.but`. There are no top-level `given`/`when`/`then` exports (to avoid `then` being treated as a thenable on the package namespace).
- **Modifiers:** Use Vitest’s `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` on step calls when needed (e.g. `story.then.skip('...')`). Use `story.skip` / `story.only` for scenario-level modifiers.
- **Attach story to a plain `it()`:** Call `story.init(task)` inside a normal `it('...', ({ task }) => { ... })` so that test appears in generated docs. Vitest does not export top-level step helpers or `doc`.
- **Rich step docs:** Use `story.note()`, `story.json()`, `story.code()`, `story.table()`, `story.mermaid()`, etc., or pass a `StoryDocs` object as the second argument (when not using a callback). See the [Features matrix](https://github.com/jagreehal/executable-stories#features-matrix) in the root README.

---

## Exports

- **Main:** `story`, types from `executable-stories-vitest`.
- **Reporter:** `createStoryReporter`, `StoryReporter`, and reporter types from `executable-stories-vitest/reporter`.

For reporter options (formats, output paths, markdown/html options), see [executable-stories-formatters](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters).
