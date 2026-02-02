---
title: First Story (Vitest)
description: Write your first Vitest scenario and see the generated docs
---

## Write a story

Create a test file (e.g. `src/login.story.test.ts`):

```typescript
import { story } from "vitest-executable-stories";
import { expect } from "vitest";

story("User logs in successfully", (steps) => {
  steps.given("the user is on the login page");
  steps.when("the user submits valid credentials");
  steps.then("the user should see the dashboard", () => {
    expect(true).toBe(true); // replace with real assertions
  });
});
```

Steps are **callback-only** in Vitest (no top-level `then` export). Use the `steps` argument: `steps.given`, `steps.when`, `steps.then`, `steps.and`, `steps.but`.

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

[Vitest story & doc API](/reference/vitest-story-api/) — steps, modifiers, `doc` API, and options.

[Converting existing Vitest tests](/guides/converting-vitest/) — adopt executable-stories without rewriting existing tests.

[Recipes (Vitest)](/recipes/vitest/) — more examples with tables, JSON, and tags.
