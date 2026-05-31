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

## Reporter

Add the reporter to Jest config.

```js
export default {
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

Supported options: `tags`, `ticket`, `meta`, `traceUrlTemplate`.

## Developer Experience

- **API:** `story.init()` plus `story.given`, `story.when`, `story.then`, `story.and`, `story.but`. Top-level step helpers are also exported.
- **Attach story to a plain test:** call `story.init()` inside the Jest `test()` or `it()` callback. Scenario title comes from the Jest test title.
- **Rich docs:** use `story.note()`, `story.json()`, `story.code()`, `story.table()`, `story.mermaid()`, and related doc methods.
- **Exports:** main package exports `story`, top-level step helpers, and types. Reporter lives at `executable-stories-jest/reporter`.
