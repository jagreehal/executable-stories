---
title: Cypress story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc API for executable-stories-cypress
---

Cypress uses the same **story.init() + story.\*** pattern as Jest (no task or `testInfo`). Call **`story.init([options])`** at the start of each test, then use **`story.given`**, **`story.when`**, **`story.then`**, and doc methods on the **`story`** object. Story metadata is sent from the browser to Node via `cy.task` so the reporter can generate docs.

## story.init([options])

Initializes a story for the current test. Must be called at the start of each test that wants documentation.

| Item      | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| **options** | Optional `StoryOptions`: `tags`, `ticket`, `meta`.                         |
| **Example** | `it('adds two numbers', () => { story.init(); story.given('...'); ... });` |

**Example with options:**

```typescript
it('admin deletes user', () => {
  story.init({
    tags: ['admin', 'destructive'],
    ticket: 'JIRA-456',
    covers: ['src/admin/users.ts'],
  });
  story.given('the admin is logged in');
  story.when('the admin deletes the user');
  story.then('the user is removed');
});
```

## Step markers (story.given, story.when, story.then, story.and, story.but)

Same as Vitest/Jest/Playwright: **`story.given`**, **`story.when`**, **`story.then`**, **`story.and`**, **`story.but`**, plus AAA aliases (`arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`). Steps accept an optional second argument **`StoryDocs`** for inline docs.

## Doc methods

Same as other frameworks: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.state`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.custom`**, same signatures as [Vitest story & doc API](/reference/vitest-story-api/).

## When a test fails

The reporter prints each failed test with its error, followed by the story's steps:

```
1) command fails mid story
   Timed out retrying after 4000ms: expected 1 to equal 2

   Story steps:
     ✓ Given a value
     ✗ When it is checked
     · Then the total updates
```

A Cypress test body queues commands and the queue runs them afterwards. When a command fails, the last step the queue reached gets the ✗ and the steps after it get `·`. When the test body itself throws, for example a plain `expect`, the last step written gets the ✗. The raw run and the reports keep the original error message.

## StoryOptions

| Option   | Type                      | Default | Description                                                     |
| -------- | ------------------------- | ------- | --------------------------------------------------------------- |
| `tags`   | `string[]`                | —       | Tags for filtering and categorizing (e.g. `["smoke", "auth"]`). |
| `ticket` | `string \| string[]`      | —       | Ticket/issue reference(s) for requirements traceability.        |
| `covers` | `string[]`                | —       | Product-code paths/globs this scenario exercises (e.g. `["src/auth/**"]`). Powers `get_scenarios_for_paths`. |
| `meta`   | `Record<string, unknown>` | —       | Arbitrary user-defined metadata.                                |

Unlike Vitest, Jest, and Playwright, Cypress does not currently expose a `traceUrlTemplate` story option because it uses a browser-to-Node reporting bridge instead of the Node test context used by the other adapters.

## Exports

- **Main:** `story`, `getAndClearMeta`, types from `executable-stories-cypress`.
- **Support:** `executable-stories-cypress/support` (side-effect: registers `afterEach` + `cy.task`).
- **Plugin:** `registerExecutableStoriesPlugin` from `executable-stories-cypress/plugin`.
- **Reporter:** default reporter and `buildRawRunFromCypressResult`, `generateReportsFromRawRun` from `executable-stories-cypress/reporter`.
