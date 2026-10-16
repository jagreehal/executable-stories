---
name: bun-story-api
description: >
  Use when writing BDD story tests for bun:test with executable-stories-bun:
  the test/it/describe wrappers, story.init(), Given/When/Then steps, doc
  entries, the bunfig.toml preload, or reading the raw run it writes.
metadata:
  type: core
  library: executable-stories-bun
  library_version: '0.0.0'
  sources:
    - 'jagreehal/executable-stories:packages/executable-stories-bun/src/index.ts'
    - 'jagreehal/executable-stories:packages/executable-stories-bun/src/collector.ts'
---

# executable-stories-bun: Story API

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

`bun test` then writes `.executable-stories/raw-run.json`. Set `EXECUTABLE_STORIES_OUTPUT` to write it elsewhere.

## Writing a story

Import `test`, `it` and `describe` from the package. Keep `expect` and the hooks from `bun:test`.

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

  test(
    'retries a flaky gateway',
    async () => {
      story.init();
      story.when('the gateway answers', () => callGateway());
    },
    { retry: 2 },
  );

  test.skip('pays by voucher', () => {});
  test.todo('pays in instalments');
});
```

- `story.init(options?)` comes first in the test body. A test that skips it runs as a plain test with no scenario.
- Steps: `given`, `when`, `then`, `and`, `but`, plus `arrange` / `act` / `assert`. A repeated Given/When/Then renders as "And".
- Pass a callback as a step's second argument to time that step.
- Docs: `note`, `tag`, `kv`, `json`, `code`, `table`, `link`.
- `describe` callbacks are synchronous. Use the package's `describe` so `describe.skip` marks its tests `skip`.

## What the raw run records

- `pass` once the body, its `afterEach` hooks, its `onTestFinished` callbacks and any `expect.assertions()` check succeed; otherwise `fail` with the error.
- `retry` and `retries` for tests with Bun's `retry` option. The steps come from the attempt that produced the result.
- Concurrent tests whose body passes report `pass` when the flush saw no failing `afterEach` and no `expect.assertions()`, and `unknown` otherwise.
- `runScope: "filtered"` when `-t` or `.only` left registered tests unrun.

## Format the run

```bash
npx executable-stories check .executable-stories/raw-run.json
npx executable-stories format .executable-stories/raw-run.json --format html
```
