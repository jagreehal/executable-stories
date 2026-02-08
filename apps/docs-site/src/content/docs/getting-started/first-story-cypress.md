---
title: First Story (Cypress)
description: Write your first Cypress scenario and see the generated docs
---

## Write a story

Create a spec file (e.g. `cypress/e2e/calculator.story.cy.ts`):

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

Use **`story.init()`** at the start of each test (no task argument; same as Jest), then **`story.given`**, **`story.when`**, **`story.then`** to mark steps. Story metadata is sent from the browser to Node via `cy.task` so the reporter can generate docs.

## Run tests

```bash
pnpm cypress run
```

Or open the Cypress UI:

```bash
pnpm cypress open
```

## Generated output

If you configured the reporter (see [Installation (Cypress)](/getting-started/installation-cypress/)), Markdown or other formats are written to your configured path. For the story above, the output looks like:

```markdown
### Adds two numbers

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8
```

## Next

[Cypress story & doc API](/reference/cypress-story-api/) — step markers, inline docs, doc methods, and options.

[Developer experience](/guides/developer-experience/) — how Cypress differs from Jest/Vitest/Playwright (e.g. meta via cy.task).
