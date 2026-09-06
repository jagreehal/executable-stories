---
name: playwright-reporter-setup
description: >
  Use when configuring the executable-stories-playwright custom reporter:
  wiring the playwright.config.ts reporter array, or output
  format/directory/naming and aggregated vs. colocated modes.
metadata:
  type: core
  library: executable-stories-playwright
  library_version: "8.10.3"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-playwright/src/reporter.ts"
---

# executable-stories-playwright — Reporter Setup

## Setup

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "executable-stories-playwright/reporter",
      {
        formats: ["markdown", "html"],
        outputDir: "docs",
        outputName: "user-stories",
      },
    ],
  ],
});
```

`executable-stories-formatters` is a bundled dependency (installed automatically with `executable-stories-playwright`).

Every run also updates `<outputDir>/by-file/`, one canonical report per test source.
Documentation formats render that accumulated suite; JUnit, Cucumber, and release
manifests describe only the current execution. Playwright detects `grep`, `grepInvert`,
and sharding automatically. Full runs may retire missing scenarios, filtered runs merge,
and incompletely collected files preserve their earlier scenarios with a warning.

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

## Core Patterns

### Minimal config

```typescript
export default defineConfig({
  reporter: [
    ["html"],
    ["executable-stories-playwright/reporter", { formats: ["markdown"] }],
  ],
});
```

### Full options

```typescript
export default defineConfig({
  reporter: [
    ["html"],
    [
      "executable-stories-playwright/reporter",
      {
        formats: ["markdown", "html", "junit", "cucumber-json"],
        outputDir: "reports",
        outputName: "test-results",
        output: {
          mode: "aggregated",
          // mode: "colocated",
          // colocatedStyle: "flat", // or "mirrored" / "adjacent"
        },
        markdown: {
          title: "User Stories",
          includeStatusIcons: true,
          includeErrors: true,
          includeMetadata: true,
          sortScenarios: "source",
        },
        html: {
          title: "Test Report",
          syntaxHighlighting: true,
          mermaidEnabled: true,
        },
        rawRunPath: "reports/raw-run.json",
      },
    ],
  ],
});
```

### Annotation-based metadata

The reporter reads story metadata from test annotations with `type: "story-meta"`. This is handled automatically when using `story.init(testInfo)` — no manual annotation is needed.

## Common Mistakes

### HIGH Using default export syntax incorrectly

Wrong:

```typescript
import StoryReporter from "executable-stories-playwright/reporter";

export default defineConfig({
  reporter: [
    ["html"],
    [new StoryReporter({ formats: ["markdown"] })],
  ],
});
```

Correct:

```typescript
export default defineConfig({
  reporter: [
    ["html"],
    [
      "executable-stories-playwright/reporter",
      { formats: ["markdown"] },
    ],
  ],
});
```

Playwright's reporter config expects a string path and options object tuple, not a class instance. Playwright instantiates the reporter itself from the path.

Source: packages/executable-stories-playwright/src/reporter.ts

### MEDIUM Default format is html, not markdown

The default `formats` is `["html"]`. Always specify `formats: ["markdown"]` explicitly to get readable markdown output.

Source: packages/executable-stories-playwright/src/reporter.ts
