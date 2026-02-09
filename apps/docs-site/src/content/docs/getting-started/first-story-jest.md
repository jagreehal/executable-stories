---
title: First Story (Jest)
description: Write your first Jest scenario and see the generated docs
---

## Write a story

Create a test file (e.g. `src/login.story.test.ts`):

```typescript
import { expect } from '@jest/globals';
import { story } from 'executable-stories-jest';

describe('Login', () => {
  it('user logs in successfully', () => {
    story.init();

    story.given('the user is on the login page');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    expect(true).toBe(true); // replace with real assertions
  });
});
```

Use **`story.init()`** at the start of the test (no task; Jest gets the test name from `expect.getState()`), then **`story.given`**, **`story.when`**, **`story.then`** to mark steps.

## Run tests

```bash
pnpm jest
```

## Generated output

The reporter writes Markdown to your configured path (e.g. `docs/user-stories.md`). For the story above, the output looks like:

```markdown
### User logs in successfully

- **Given** the user is on the login page
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

## Next

[Jest story & doc API](/reference/jest-story-api/) — steps, doc methods, and options.

[Converting existing Jest tests](/guides/converting-jest/) — adopt executable-stories without rewriting existing tests.

[Recipes (Jest)](/recipes/jest/) — more examples.
