---
title: Jest story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc API for executable-stories-jest
---

Jest uses the same **story.init() + story.\*** pattern as Vitest and Playwright. Call **`story.init([options])`** at the start of each test (no task argument; Jest gets the test name from `expect.getState()`), then use **`story.given`**, **`story.when`**, **`story.then`**, and doc methods on the **`story`** object.

## story.init([options])

Initializes a story for the current test. Must be called at the start of each test that wants documentation.

| Item        | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| **options** | Optional `StoryOptions`: `tags`, `ticket`, `meta`.                         |
| **Example** | `it('adds two numbers', () => { story.init(); story.given('...'); ... });` |

**Example with options:**

```typescript
it('admin deletes user', () => {
  story.init({
    tags: ['admin', 'destructive'],
    ticket: 'JIRA-456',
  });
  story.given('the admin is logged in');
  story.when('the admin deletes the user');
  story.then('the user is removed');
});
```

## Step markers and doc methods

Same as Vitest: **`story.given`**, **`story.when`**, **`story.then`**, **`story.and`**, **`story.but`**, plus AAA aliases (`arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`). Steps accept an optional second argument **`StoryDocs`** for inline docs.

Doc methods: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.custom`** — all with the same signatures as Vitest (options objects except `note(text)` and `tag(name | names)`).

**Example:**

```typescript
import { expect } from '@jest/globals';
import { story } from 'executable-stories-jest';

describe('Calculator', () => {
  it('adds two numbers', () => {
    story.init();

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

## StoryOptions

Same as Vitest: `tags`, `ticket`, `meta`. See [Vitest story & doc API](/reference/vitest-story-api/) for detailed doc method descriptions and inline-doc examples.
