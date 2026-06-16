# executable-stories-jest

BDD-style executable stories for Jest with documentation generation. Uses Jest's native `describe` / `it`; step markers and optional callbacks register scenario metadata for the reporter.

## Install

```bash
pnpm add -D executable-stories-jest executable-stories-formatters
```

## Usage

Call `story.init()` at the start of any test that should appear in generated docs.

```ts
import { expect, it } from '@jest/globals';
import { story } from 'executable-stories-jest';

it('adds two numbers', () => {
  story.init();

  story.given('two numbers 5 and 3');
  const a = 5;
  const b = 3;

  story.when('I add them together');
  const result = a + b;

  story.then('the result is 8');
  expect(result).toBe(8);
});
```

Top-level step helpers are also exported for compatibility:

```ts
import { given, story, then, when } from 'executable-stories-jest';

it('logs in', () => {
  story.init();
  given('a registered user');
  when('valid credentials are submitted');
  then('the dashboard is shown');
});
```

## Two step styles

You can use steps in two ways (and mix them in the same test).

### Marker-only (code after the marker)

Step text documents intent; the implementation lives on the following lines (as in the examples above).

### Optional callback (code inside the step)

Pass a function as the second argument to `given` / `when` / `then` / `and` / `but`. The step is recorded, then the function runs. If it returns a `Promise`, that promise is returned so you can `await story.when('...', async () => { ... })`.

```ts
it('adds two numbers', async () => {
  story.init();

  story.given('two numbers 5 and 3', () => {
    a = 5;
    b = 3;
  });

  const result = await story.when('I add them together', async () => a + b);

  story.then('the result is 8', () => {
    expect(result).toBe(8);
  });
});
```

## Reporter

Add the reporter **and** the setup file to your Jest config.

```js
export default {
  // REQUIRED: without this the reporter receives no data and produces empty output.
  setupFilesAfterEnv: ['executable-stories-jest/setup'],
  reporters: [
    'default',
    [
      'executable-stories-jest/reporter',
      {
        formats: ['markdown', 'html'],
        outputDir: 'docs',
        outputName: 'user-stories',
      },
    ],
  ],
};
```

`setupFilesAfterEnv: ['executable-stories-jest/setup']` is **required**: it registers an `afterAll` hook that flushes recorded stories to disk for the reporter to read. Without it, the reporter gets no data and generates empty output.

Options match `FormatterOptions` from `executable-stories-formatters`. Optional `rawRunPath` writes raw run JSON for use with the `executable-stories` CLI.

## Story Options

Pass options to `story.init(options)`:

```ts
story.init({
  tags: ['smoke', 'auth'],
  ticket: 'AUTH-123',
  meta: { owner: 'platform' },
});
```

Supported options: `tags`, `ticket`, `covers`, `meta`, `traceUrlTemplate`.

| Option             | Description |
| ------------------ | ----------- |
| `tags`             | String array for categorization and filtering (e.g. `['smoke', 'auth']`). |
| `ticket`           | Ticket/issue ID(s) for traceability (e.g. `'AUTH-123'`). |
| `covers`           | Product-code paths/globs this scenario exercises (project-root-relative), for coverage/traceability (e.g. `['src/auth/**']`). |
| `meta`             | Arbitrary key-value metadata. |
| `traceUrlTemplate` | URL template for OTel trace links; use `{traceId}` placeholder. Can also be set via `OTEL_TRACE_URL_TEMPLATE`. |

## Developer Experience

- **API:** `story.init()` plus `story.given`, `story.when`, `story.then`, `story.and`, `story.but`. Top-level step helpers are also exported.
- **Attach story to a plain test:** call `story.init()` inside the Jest `test()` or `it()` callback. Scenario title comes from the Jest test title.
- **Rich docs:** use `story.note()`, `story.json()`, `story.code()`, `story.table()`, `story.mermaid()`, and related doc methods.
- **Exports:** main package exports `story`, top-level step helpers, and types. Reporter lives at `executable-stories-jest/reporter`; the required setup file lives at `executable-stories-jest/setup`.
