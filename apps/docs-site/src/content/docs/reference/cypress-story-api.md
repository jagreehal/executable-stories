---
title: Cypress story & doc API
description: story.init(), story.given/when/then, StoryOptions, and doc API for executable-stories-cypress
---

Cypress uses the same **story.init() + story.\*** pattern as Jest (no task or testInfo). Call **`story.init([options])`** at the start of each test, then use **`story.given`**, **`story.when`**, **`story.then`**, and doc methods on the **`story`** object. Story metadata is sent from the browser to Node via `cy.task` so the reporter can generate docs.

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
  });
  story.given('the admin is logged in');
  story.when('the admin deletes the user');
  story.then('the user is removed');
});
```

## Step markers (story.given, story.when, story.then, story.and, story.but)

Same as Vitest/Jest/Playwright: **`story.given`**, **`story.when`**, **`story.then`**, **`story.and`**, **`story.but`**, plus AAA aliases (`arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`). Steps accept an optional second argument **`StoryDocs`** for inline docs.

## Doc methods

Same as other frameworks: **`story.note`**, **`story.tag`**, **`story.kv`**, **`story.json`**, **`story.code`**, **`story.table`**, **`story.link`**, **`story.section`**, **`story.mermaid`**, **`story.screenshot`**, **`story.custom`** — same signatures as [Vitest story & doc API](/reference/vitest-story-api/).

## StoryOptions

| Option   | Type                      | Default | Description                                                     |
| -------- | ------------------------- | ------- | --------------------------------------------------------------- |
| `tags`   | `string[]`                | —       | Tags for filtering and categorizing (e.g. `["smoke", "auth"]`). |
| `ticket` | `string \| string[]`      | —       | Ticket/issue reference(s) for requirements traceability.        |
| `meta`   | `Record<string, unknown>` | —       | Arbitrary user-defined metadata.                                |

## Exports

- **Main:** `story`, `getAndClearMeta`, types from `executable-stories-cypress`.
- **Support:** `executable-stories-cypress/support` (side-effect: registers `afterEach` + `cy.task`).
- **Plugin:** `registerExecutableStoriesPlugin` from `executable-stories-cypress/plugin`.
- **Reporter:** default reporter and `buildRawRunFromCypressResult`, `generateReportsFromRawRun` from `executable-stories-cypress/reporter`.
