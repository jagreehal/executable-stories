---
title: Recipes (Cypress)
description: Example scenarios with Cypress code and generated Markdown output
slug: recipes/cypress
---

Example scenarios are implemented in **Cypress** in [apps/cypress-example](https://github.com/jagreehal/executable-stories/tree/main/apps/cypress-example). You use **native** `describe` / `it` and the **`story`** object: call **`story.init()`** at the start of each test (no task argument; same as Jest), then **`story.given`**, **`story.when`**, **`story.then`**. Story meta is sent from the browser to Node via `cy.task` for the reporter.

## Key difference from other frameworks

| | Vitest/Jest | Cypress |
| - | ----------- | ------- |
| Init | `story.init(task)` / `story.init()` | `story.init()` |
| Reporter config | In test config file | Via CLI flag or Module API |
| Meta transport | Direct (in-process) | Browser → Node via `cy.task` |
| Setup | config reporter | Plugin + support file |

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

```markdown
### Adds two numbers

- **Given** two numbers 5 and 3
- **When** I add them together
- **Then** the result is 8
```

## Example: Login with tags and doc methods

```typescript
import { story } from 'executable-stories-cypress';

describe('Login', () => {
  it('User logs in successfully', () => {
    story.init({ tags: ['smoke', 'auth'] });
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.note('Account must be active for at least 24 hours.');
    story.when('the user submits valid credentials');
    story.json({
      label: 'Credentials',
      value: { email: 'user@example.com', password: '***' },
    });
    story.then('the user should see the dashboard');
  });
});
```

## Example: Login blocked for suspended user (with But)

```typescript
import { story } from 'executable-stories-cypress';

describe('Login', () => {
  it('Login blocked for suspended user', () => {
    story.init();
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```

## Generating reports

Cypress reports are generated via the Mocha reporter flag or the Module API:

```bash
# Via CLI flag
cypress run --reporter executable-stories-cypress/reporter --reporter-options outputDir=docs,outputName=user-stories

# Via Module API
import { buildRawRunFromCypressResult, generateReportsFromRawRun } from 'executable-stories-cypress/reporter';
const result = await cypress.run();
const rawRun = buildRawRunFromCypressResult(result, { projectRoot: process.cwd() });
await generateReportsFromRawRun(rawRun, { formats: ['markdown', 'html'], outputDir: 'docs' });
```

## Full example suite (Cypress)

The [cypress-example](https://github.com/jagreehal/executable-stories/tree/main/apps/cypress-example) app includes specs for calculator, step aliases, story options, wrapped steps, and Gherkin-style patterns. Generated docs: `apps/cypress-example/docs/user-stories.md`.

For a full list of patterns, see the [Vitest recipes](recipes/vitest/) — the same scenarios can be adapted to Cypress by replacing `story.init(task)` with `story.init()` and using `describe`/`it` from Mocha.

[Cypress story & doc API](reference/cypress-story-api/) — steps and doc usage.
