---
title: Recipes (Jest)
description: Example scenarios with Jest code and generated output
slug: recipes/jest
---

The same replicate scenarios are implemented in **Jest** in [jest-example](https://github.com/jagreehal/executable-stories/tree/main/apps/jest-example). Jest uses **top-level** step functions: `given`, `when`, `then`, `and`, `but` (no callback).

## Example: User logs in successfully

### Generated output

Same as Vitest: Given/And/When/Then bullets (see [Vitest recipe](/recipes/vitest/user-logs-in-successfully/)).

### Jest code

```typescript
import { story, given, when, then } from "jest-executable-stories";

story("User logs in successfully", () => {
  given("the user account exists");
  given("the user is on the login page");
  given("the account is active");
  when("the user submits valid credentials");
  then("the user should see the dashboard");
});
```

## Full recipe list (Jest)

The same 30 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/jest-example/src/replicate.story.test.ts`. Generated docs: `apps/jest-example/src/replicate.story.docs.md` (or colocated output). For each scenario:

- **Generated output** is the same (same story structure and doc API).
- **Code** uses top-level `given`/`when`/`then`/`and`/`but` and `doc.*` instead of `steps.given`/`s.doc`.

| Scenario | Pattern |
|----------|---------|
| User logs in successfully | Multiple Given, single When, single Then |
| User updates profile details | Single Given, multiple When, single Then |
| Checkout calculates totals | Single Given, single When, multiple Then |
| Password reset flow | Multiple Given/When/Then |
| Login blocked for suspended user | Use of But |
| Bulk user creation | doc.table |
| API accepts JSON payload | doc.json |
| … | See [Vitest recipes](/recipes/vitest/) for full list and output examples. |

[Jest story & doc API](/reference/jest-story-api/) — steps and doc usage.
