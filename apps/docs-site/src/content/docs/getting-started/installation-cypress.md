---
title: Installation (Cypress)
description: Install executable-stories-cypress, register the plugin, and add the support file
---

## Install the package

```bash
pnpm add -D executable-stories-cypress
```

Or with npm:

```bash
npm install -D executable-stories-cypress
```

## Register the plugin

In `cypress.config.ts`, register the executable-stories task so story meta can be sent from the browser to Node:

```typescript
import { defineConfig } from 'cypress';
import { registerExecutableStoriesPlugin } from 'executable-stories-cypress/plugin';

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});
```

## Add the support file

Import the support file so story meta is sent after each test (e.g. in `cypress/support/e2e.ts`):

```typescript
import 'executable-stories-cypress/support';
```

This registers an `afterEach` that sends collected story metadata to Node via `cy.task`.

## Reporter (optional)

To generate Markdown or HTML from Cypress runs you can:

- Use the Mocha reporter when Cypress invokes it: `--reporter executable-stories-cypress/reporter` with `--reporter-options outputDir=...,outputName=...`.
- Or use the Module API: after `cypress.run()`, call `buildRawRunFromCypressResult(result, options)` then `generateReportsFromRawRun(rawRun, options)` (see exports from `executable-stories-cypress/reporter`).

Options match the formatters’ `FormatterOptions` (e.g. `formats`, `outputDir`, `outputName`, `markdown`). See [Cypress reporter options](/reference/cypress-config/) for details.

## Next

[First Story (Cypress)](/getting-started/first-story-cypress/) — write your first scenario and see the generated docs.

[Cypress reporter options](/reference/cypress-config/) — all configuration options.
