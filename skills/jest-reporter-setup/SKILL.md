---
name: jest-reporter-setup
description: >
  Configure Jest custom reporter for executable-stories-jest. jest.config
  reporters array with options. setupFilesAfterEnv for story flushing.
  Output formats, directory, naming. Aggregated and colocated modes.
type: core
library: executable-stories-jest
library_version: "8.4.3"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-jest/src/reporter.ts"
---

# executable-stories-jest — Reporter Setup

## Setup

```javascript
// jest.config.mjs
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    [
      "executable-stories-jest/reporter",
      {
        formats: ["markdown", "html"],
        outputDir: "docs",
        outputName: "user-stories",
      },
    ],
  ],
};
```

Both the `setup` file and the `reporter` entry are required. Peer dependency: `executable-stories-formatters` must be installed.

## Core Patterns

### Minimal config

```javascript
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    ["executable-stories-jest/reporter", { formats: ["markdown"] }],
  ],
};
```

### Full options

```javascript
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    [
      "executable-stories-jest/reporter",
      {
        formats: ["markdown", "html", "junit", "cucumber-json"],
        outputDir: "reports",
        outputName: "test-results",
        output: {
          mode: "aggregated",
          // mode: "colocated",
          // colocatedStyle: "mirrored",
        },
        markdown: {
          title: "User Stories",
          includeStatusIcons: true,
          includeErrors: true,
          includeMetadata: true,
          sortScenarios: "source",
          ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
        },
        html: {
          title: "Test Report",
          darkMode: true,
          searchable: true,
        },
        rawRunPath: "reports/raw-run.json",
      },
    ],
  ],
};
```

### File-based communication

Jest uses worker processes. Stories are written to `.jest-executable-stories/worker-{id}/*.json` during execution. The reporter aggregates these files in `onRunComplete`. The `JEST_STORY_DOCS_DIR` env var overrides the temp directory.

## Common Mistakes

### CRITICAL Missing setupFilesAfterEnv entry

Wrong:

```javascript
export default {
  reporters: [
    "default",
    ["executable-stories-jest/reporter", { formats: ["markdown"] }],
  ],
};
```

Correct:

```javascript
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    ["executable-stories-jest/reporter", { formats: ["markdown"] }],
  ],
};
```

The setup file registers an `afterAll` hook that flushes story metadata to disk at the end of each test file. Without it, the reporter receives no data and produces empty output.

Source: packages/executable-stories-jest/src/reporter.ts

### HIGH Using the reporter path as a string instead of tuple

Wrong:

```javascript
reporters: ["default", "executable-stories-jest/reporter"]
```

Correct:

```javascript
reporters: [
  "default",
  ["executable-stories-jest/reporter", { formats: ["markdown"] }],
]
```

Without options, the default format is `["cucumber-json"]`. Use the tuple form `[path, options]` to specify formats and output directory.

Source: packages/executable-stories-jest/src/reporter.ts

### MEDIUM Default format is cucumber-json, not markdown

The default `formats` is `["cucumber-json"]`. Always specify `formats: ["markdown"]` (or other desired formats) explicitly.

Source: packages/executable-stories-jest/src/reporter.ts
