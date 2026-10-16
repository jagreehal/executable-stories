# executable-stories-bun

BDD-style executable stories for `bun:test`. Writes the shared raw run (`.executable-stories/raw-run.json`) that the `executable-stories` CLI turns into HTML, Markdown, JUnit and Cucumber reports.

```toml
# bunfig.toml
[test]
preload = ["executable-stories-bun/preload"]
```

```ts
import { expect } from 'bun:test';
import { describe, story, test } from 'executable-stories-bun';

describe('Calculator', () => {
  test('adds two numbers', () => {
    story.init({ ticket: 'CALC-1', covers: ['src/calc.ts'] });
    story.given('two numbers 5 and 3');
    story.when('I add them together');
    story.then('the result is 8');
    expect(5 + 3).toBe(8);
  });
});
```

`test` / `it` / `describe` here wrap `bun:test`'s and record each test's name, location and result. See the [Bun story API docs](https://docs.executablestories.com/reference/bun-story-api/) for the output fields and limits.
