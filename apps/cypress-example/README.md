# cypress-example

Example app for [executable-stories-cypress](../../packages/executable-stories-cypress): BDD-style stories with Cypress and generated Markdown docs.

## Setup

From repo root:

```bash
pnpm install
pnpm --filter executable-stories-cypress build
cd apps/cypress-example && pnpm exec cypress install   # if Cypress binary not installed
```

## Run tests

```bash
pnpm test          # headless
pnpm test:open     # interactive
```

## Generated docs

After `pnpm test`, open `docs/user-stories.md` for the aggregated User Stories report.

## Structure

- **cypress.config.ts** — Plugin (`registerExecutableStoriesPlugin`), reporter, reporterOptions (formats, outputDir, markdown).
- **cypress/support/e2e.ts** — Imports `executable-stories-cypress/support` so story meta is sent to Node after each test.
- **cypress/e2e/*.story.cy.ts** — Specs using `story.init()`, `story.given/when/then`, options, aliases, tables.
- **src/calculator.ts** — Shared module used by calculator spec.

Same patterns as [playwright-example](../playwright-example): calculator, story-options, step-aliases, gherkin-patterns.
