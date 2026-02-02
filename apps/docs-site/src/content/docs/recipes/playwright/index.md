---
title: Recipes (Playwright)
description: Example scenarios with Playwright code and generated output
slug: recipes/playwright
---

The same replicate scenarios are implemented in **Playwright** in [playwright-example](https://github.com/jagreehal/executable-stories/tree/main/apps/playwright-example). Playwright uses **top-level** step functions; step callbacks receive **fixtures** (e.g. `{ page }`).

## Example: User logs in successfully

### Generated output

Same as Vitest (see [Vitest recipe](/recipes/vitest/user-logs-in-successfully/)).

### Playwright code

```typescript
import { story, given, when, then } from "playwright-executable-stories";

story("User logs in successfully", () => {
  given("the user account exists");
  given("the user is on the login page");
  given("the account is active");
  when("the user submits valid credentials");
  then("the user should see the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

## Full recipe list (Playwright)

The same 30 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/playwright-example/src/replicate.story.spec.ts`. Generated docs: `apps/playwright-example/src/replicate.docs.md`. For each scenario:

- **Generated output** is the same.
- **Code** uses top-level `given`/`when`/`then`/`and`/`but` and `doc.*`; step implementations can use `async ({ page }) => { ... }`.

[Playwright story & doc API](/reference/playwright-story-api/) — steps, fixtures, and doc usage.
