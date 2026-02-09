---
title: First Story (Vitest)
description: Write your first Vitest scenario and see the generated docs
---

## Write a story

Create a test file (e.g. `src/login.story.test.ts`):

```typescript
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('Login', () => {
  it('user logs in successfully', ({ task }) => {
    story.init(task);

    story.given('the user is on the login page');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    expect(true).toBe(true); // replace with real assertions
  });
});
```

Use **`story.init(task)`** at the start of the test (with **`task`** from the callback), then **`story.given`**, **`story.when`**, **`story.then`** to mark steps. There is no callback-based `story("Title", define)` — you use native `describe`/`it` and the `story` object.

## Run tests

```bash
pnpm vitest run
```

## Generated output

The reporter writes Markdown to `docs/user-stories.md` (or your configured path). For the story above, the output looks like:

```markdown
### User logs in successfully

- **Given** the user is on the login page
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

If a step is skipped, failed, or todo, the docs reflect that (e.g. ⚠️ or ❌).

## Next

[Vitest story & doc API](/reference/vitest-story-api/) — step markers, inline docs, doc methods, and options.

[Converting existing Vitest tests](/guides/converting-vitest/) — adopt executable-stories without rewriting existing tests.

[Recipes (Vitest)](/recipes/vitest/) — more examples with tables, JSON, and tags.
