---
title: First Story (Playwright)
description: Write your first Playwright scenario and see the generated docs
---

## Write a story

Create a spec file (e.g. `src/login.story.spec.ts`):

```typescript
import { story, given, when, then } from "playwright-executable-stories";
import { expect } from "@playwright/test";

story("User logs in successfully", () => {
  given("the user is on the login page");
  when("the user submits valid credentials");
  then("the user should see the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

Playwright uses **top-level** step functions. Step callbacks receive Playwright fixtures (e.g. `{ page }`).

## Run tests

```bash
pnpm playwright test
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

[Playwright story & doc API](/reference/playwright-story-api/) — steps, modifiers, and options.

[Converting existing Playwright tests](/guides/converting-playwright/) — adopt executable-stories without rewriting existing tests.

[Recipes (Playwright)](/recipes/playwright/) — more examples.
