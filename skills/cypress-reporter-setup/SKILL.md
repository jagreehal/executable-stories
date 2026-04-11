---
name: cypress-reporter-setup
description: >
  Configure Cypress reporter for executable-stories-cypress. Mocha reporter
  via --reporter flag or cypress.config.ts. Module API for programmatic use
  with buildRawRunFromCypressResult and generateReportsFromRawRun. Output
  formats, directory, naming.
type: core
library: executable-stories-cypress
library_version: "7.0.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-cypress/src/reporter.ts"
---

# executable-stories-cypress — Reporter Setup

## Setup

### Option A: Mocha reporter (CLI)

```bash
cypress run \
  --reporter executable-stories-cypress/reporter \
  --reporter-options "outputDir=docs,outputName=user-stories,formats=markdown"
```

### Option B: Module API (programmatic)

```typescript
// cypress.config.ts
import { defineConfig } from "cypress";
import { registerExecutableStoriesPlugin } from "executable-stories-cypress/plugin";
import {
  buildRawRunFromCypressResult,
  generateReportsFromRawRun,
} from "executable-stories-cypress/reporter";

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});

// After cypress.run() completes:
const result = await cypress.run();
const rawRun = buildRawRunFromCypressResult(result, { outputDir: "docs" });
await generateReportsFromRawRun(rawRun, {
  formats: ["markdown", "html"],
  outputDir: "docs",
  outputName: "user-stories",
});
```

Peer dependency: `executable-stories-formatters` must be installed.

## Core Patterns

### Mocha reporter with all options

```bash
cypress run \
  --reporter executable-stories-cypress/reporter \
  --reporter-options "outputDir=reports,outputName=test-results,formats=markdown+html+junit"
```

### Module API for CI pipelines

```typescript
import cypress from "cypress";
import {
  buildRawRunFromCypressResult,
  generateReportsFromRawRun,
} from "executable-stories-cypress/reporter";

const result = await cypress.run({ spec: "cypress/e2e/**/*.story.cy.ts" });

if (result.status === "finished") {
  const rawRun = buildRawRunFromCypressResult(result);
  await generateReportsFromRawRun(rawRun, {
    formats: ["markdown"],
    outputDir: "docs",
    outputName: "cypress-stories",
  });
}
```

## Common Mistakes

### CRITICAL Forgetting plugin + support wiring

The reporter only works if both the plugin and support file are configured. Without them, the reporter has no story metadata to process. See cypress-story-api/SKILL.md for the required wiring.

### HIGH Using reporter without Module API in afterRun

Wrong:

```typescript
// Expecting reporter to auto-generate reports
export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
  reporter: "executable-stories-cypress/reporter",
});
```

The Mocha reporter approach works for CLI usage (`cypress run --reporter`). For programmatic usage with `cypress.run()`, use the Module API (`buildRawRunFromCypressResult` + `generateReportsFromRawRun`).

Source: packages/executable-stories-cypress/src/reporter.ts
