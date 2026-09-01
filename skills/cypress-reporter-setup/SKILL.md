---
name: cypress-reporter-setup
description: >
  Use when configuring the executable-stories-cypress reporter: wiring the
  Mocha reporter via --reporter or cypress.config.ts, or using the module
  API (buildRawRunFromCypressResult, generateReportsFromRawRun) for
  programmatic report generation.
metadata:
  type: core
  library: executable-stories-cypress
  library_version: "8.8.0"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-cypress/src/reporter.ts"
---

# executable-stories-cypress — Reporter Setup

## Setup

### Option A: Mocha reporter (CLI)

```bash
cypress run \
  --reporter executable-stories-cypress/reporter.cjs \
  --reporter-options "outputDir=docs,outputName=user-stories,formats=markdown"
```

Mocha's `--reporter-options` parses `key=value` pairs into string values only — it has no syntax for array values, so `formats` can only be set to a single format name this way. To generate multiple formats (e.g. markdown + html + junit), use the Module API instead.

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

`executable-stories-formatters` is a bundled dependency (installed automatically with `executable-stories-cypress`).

Every formatted run updates `<outputDir>/by-file/`, one canonical report per test
source. Documentation formats render that accumulated suite; JUnit, Cucumber, and
release manifests describe only the current execution. Cypress cannot detect
`@cypress/grep`: pass `runScope: "filtered"` for a narrowed run, or `"full"` only when
the run covered every scenario in its specs. Leaving it absent preserves earlier
scenarios and warns rather than deleting on a guess.

Those per-file reports are generated state, not artefacts to commit. Each carries a
`runId` and per-step durations, so committing them leaves a dirty tree after every run,
and a release gate like `git diff --exit-code` then fails forever while looking like
someone forgot to commit generated docs. Ignore the directory instead:

```gitignore
**/<outputDir>/by-file/
```

The `**/` matters. A bare `docs/by-file/` is anchored to the file it sits in, so in a
monorepo it will not match `packages/anything/docs/by-file/`. Add the same line to
`.prettierignore`, or your formatter's equivalent, if it walks your docs directory.

CI-pipeline variant of the Module API (guarding on `result.status`): [REFERENCE.md](REFERENCE.md).

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
  reporter: "executable-stories-cypress/reporter.cjs",
});
```

The Mocha reporter approach works for CLI usage (`cypress run --reporter`). For programmatic usage with `cypress.run()`, use the Module API (`buildRawRunFromCypressResult` + `generateReportsFromRawRun`).

Source: packages/executable-stories-cypress/src/reporter.ts
