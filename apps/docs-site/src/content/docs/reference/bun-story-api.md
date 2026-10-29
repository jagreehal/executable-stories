---
title: Bun story & doc API
description: story.init() for bun:test, the test/describe wrappers, and the raw run the preload writes
---

`executable-stories-bun` brings the story API to `bun:test`. The package exports thin `test` / `it` / `describe` wrappers over `bun:test` that record each test's name, location and result. A preload writes the raw run when Bun finishes.

## Setup

Requires Bun 1.3.3 or later.

```bash
bun add -d executable-stories-bun
```

```toml
# bunfig.toml
[test]
preload = ["executable-stories-bun/preload"]
```

## Writing a story

Take `test`, `it` and `describe` from the package; keep `expect` and hooks from `bun:test`.

```ts
import { expect } from 'bun:test';
import { describe, story, test } from 'executable-stories-bun';

describe('Checkout', () => {
  test('pays by card', () => {
    story.init({ tags: ['payments'], ticket: 'PAY-1', covers: ['src/pay.ts'] });

    story.given('a basket with one item');
    story.when('the customer pays');
    const order = pay();
    story.then('the order is placed');
    expect(order.status).toBe('placed');
  });

  test.skip('pays by voucher', () => {});
  test.todo('pays in instalments');
});
```

A test that never calls `story.init()` runs as a plain test and produces no scenario.

### Story methods

- `init(options?)`: `tags`, `ticket` (string, `{ id, url? }`, or an array), `covers` (project-root-relative paths/globs), `meta`
- `given` / `when` / `then` / `and` / `but`: a repeated Given/When/Then renders as "And"
- `arrange` / `act` / `assert`: AAA aliases
- Pass a callback as the second argument to wrap a step body and record its duration: `story.when('pays', () => pay())`
- Docs: `note(text)`, `tag(names)`, `kv({ label, value })`, `json({ label, value })`, `code({ label, content, lang? })`, `table({ label, columns, rows })`, `link({ label, url })`

### Wrappers

- `test(name, fn, options?)`, `test.only`, `test.skip`, `test.todo`; `it` is the same function. `options` takes Bun's `timeout`, `retry` and `repeats`.
- `describe(name, fn)`, `describe.only`, `describe.skip`, `describe.todo`, with synchronous callbacks

## Output

The run is written to `.executable-stories/raw-run.json` (override with `EXECUTABLE_STORIES_OUTPUT`, resolved against the working directory):

| Field | Source |
| --- | --- |
| `status` | `pass` once the body, its `afterEach` hooks, its `onTestFinished` callbacks and any `expect.assertions()` / `expect.hasAssertions()` check all succeed; `fail` when any of them fails; `skip` / `todo` from registration; `timeout` when Bun stopped a body that never settled |
| `error`, `stepEvents` | The error that failed the test; the last step started is marked failed |
| `retry`, `retries` | The attempt that produced the result (from 0) and the test's `retry` option. Each attempt starts a fresh story, so the report shows the last attempt's steps |
| `sourceFile`, `sourceLine` | The `test(...)` call site |
| `runScope` | `filtered` when any registered test never ran (`-t`, `.only`, `--only`), otherwise `full` |
| `coveredSourceFiles` | Every file that registered a test through the wrappers |
| `incompleteSourceFiles` | Files where a test failed before calling `story.init()` |
| `gitSha` | `GITHUB_SHA` / `GIT_COMMIT` / `CI_COMMIT_SHA`, else `git rev-parse HEAD` |

Under `--isolate` and `--parallel`, each file flushes on its own and merges into the run file written by earlier files of the same `bun test` invocation.

### Concurrent tests

Under `--concurrent` or `test.concurrent`, a test whose body fails reports `fail`. A test whose body passes reports `pass` when every `afterEach` in the flush (the file under `--isolate`, otherwise the run) succeeded and no test declared `expect.assertions()`. Otherwise it reports `unknown` with an `error` naming the reason. Run those tests serially for a per-test result.

```bash
bun test
npx executable-stories check .executable-stories/raw-run.json
npx executable-stories format .executable-stories/raw-run.json --format html
```

## When a test fails

The failure message lists the story's steps: ✓ for each step the test passed and ✗ for the one that failed. A wrapped step whose body throws gets the ✗; otherwise the last step before the failing assertion does. The raw run keeps the original error message.

## Scope

- The adapter records tests registered through its own `test` / `it`. Take `describe` from the package too, so tests under `describe.skip` report `skip`.
- Steps carry no `assertions` field.
- `done`-callback tests, `test.each`, `test.if` and `test.failing` run as plain `bun:test` tests.
- Format the raw run with the CLI; the adapter has no reporter options.
