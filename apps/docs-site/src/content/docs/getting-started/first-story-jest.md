---
title: First Story (Jest)
description: Write your first Jest scenario and see the generated docs
---

## Write a story

Create a test file (e.g. `src/login.story.test.ts`):

```typescript
import { story, given, when, then } from "jest-executable-stories";
import { expect } from "@jest/globals";

story("User logs in successfully", () => {
  given("the user is on the login page");
  when("the user submits valid credentials");
  then("the user should see the dashboard", () => {
    expect(true).toBe(true); // replace with real assertions
  });
});
```

Jest uses **top-level** step functions: `given`, `when`, `then`, `and`, `but`.

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

[Jest story & doc API](/reference/jest-story-api/) — steps, modifiers, and options.

[Converting existing Jest tests](/guides/converting-jest/) — adopt executable-stories without rewriting existing tests.

[Recipes (Jest)](/recipes/jest/) — more examples.
