---
title: Recipes (Cypress)
description: Example scenarios with Cypress code and generated output
slug: recipes/cypress
---

Example scenarios are implemented in **Cypress** in [cypress-example](https://github.com/jagreehal/executable-stories/tree/main/apps/cypress-example). You use **native** `describe` / `it` and the **`story`** object: call **`story.init()`** at the start of each test (no task argument; same as Jest), then **`story.given`**, **`story.when`**, **`story.then`**. Story meta is sent from the browser to Node via `cy.task` for the reporter.

## Example: Calculator adds two numbers

### Cypress code

```typescript
import { story } from 'executable-stories-cypress';

describe('Calculator', () => {
  it('adds two numbers', () => {
    story.init();
    story.given('two numbers 5 and 3');
    const a = 5, b = 3;
    story.when('I add them together');
    const result = a + b;
    story.then('the result is 8');
    expect(result).toBe(8);
  });
});
```

### Generated output

Same structure as other frameworks: scenario heading and Given/When/Then bullets (see [First Story (Cypress)](/getting-started/first-story-cypress/)).

## Full example suite (Cypress)

The [cypress-example](https://github.com/jagreehal/executable-stories/tree/main/apps/cypress-example) app includes specs for calculator, step aliases, story options, wrapped steps, and Gherkin-style patterns. Generated docs: `apps/cypress-example/docs/user-stories.md`.

[Cypress story & doc API](/reference/cypress-story-api/) — steps and doc usage.
