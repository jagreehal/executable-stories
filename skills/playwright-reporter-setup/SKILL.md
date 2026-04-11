---
name: playwright-reporter-setup
description: >
  Configure Playwright custom reporter for executable-stories-playwright.
  playwright.config.ts reporter array. Default export from
  executable-stories-playwright/reporter. Output formats, directory, naming.
  Aggregated and colocated modes. rawRunPath for CLI.
type: core
library: executable-stories-playwright
library_version: "7.0.1"
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

Peer dependency: `executable-stories-formatters` must be installed.

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
          darkMode: true,
          searchable: true,
          embedScreenshots: true,
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

### MEDIUM Default format is cucumber-json, not markdown

The default `formats` is `["cucumber-json"]`. Always specify `formats: ["markdown"]` explicitly to get readable markdown output.

Source: packages/executable-stories-playwright/src/reporter.ts
