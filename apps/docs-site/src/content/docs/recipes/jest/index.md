---
title: Recipes (Jest)
description: Example scenarios with Jest code and generated output
slug: recipes/jest
---

The same replicate scenarios are implemented in **Jest** in [jest-example](https://github.com/jagreehal/executable-stories/tree/main/apps/jest-example). You use **native** `describe` / `it` and the **`story`** object: call **`story.init()`** at the start of each test, then **`story.given`**, **`story.when`**, **`story.then`** (and **`story.and`**, **`story.but`**).

## Example: User logs in successfully

### Generated output

Same as Vitest: Given/And/When/Then bullets (see [Vitest recipe](/recipes/vitest/user-logs-in-successfully/)).

### Jest code

```typescript
import { expect } from '@jest/globals';
import { story } from 'executable-stories-jest';

describe('Login', () => {
  it('User logs in successfully', () => {
    story.init();
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.given('the account is active');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
    expect(true).toBe(true); // or real assertions
  });
});
```

## Full recipe list (Jest)

The same 30 scenarios as [Vitest recipes](/recipes/vitest/) are in `apps/jest-example/src/replicate.story.test.ts`. Generated docs: `apps/jest-example/src/replicate.story.docs.md` (or colocated output). For each scenario:

- **Generated output** is the same (same story structure and doc API).
- **Code** uses `story.init()` and `story.given` / `story.when` / `story.then` (and `story.note`, `story.json`, etc.) inside normal `it()` callbacks.

| Scenario                         | Pattern                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- |
| User logs in successfully        | Multiple Given, single When, single Then                                  |
| User updates profile details     | Single Given, multiple When, single Then                                  |
| Checkout calculates totals       | Single Given, single When, multiple Then                                  |
| Password reset flow              | Multiple Given/When/Then                                                  |
| Login blocked for suspended user | Use of But                                                                |
| Bulk user creation               | doc.table                                                                 |
| API accepts JSON payload         | doc.json                                                                  |
| …                                | See [Vitest recipes](/recipes/vitest/) for full list and output examples. |

[Jest story & doc API](/reference/jest-story-api/) — steps and doc usage.
