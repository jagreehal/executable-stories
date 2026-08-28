---
name: jest-reporter-setup
description: >
  Use when configuring the executable-stories-jest custom reporter: wiring
  the jest.config reporters array, setupFilesAfterEnv for story flushing, or
  output format/directory/naming and aggregated vs. colocated modes.
metadata:
  type: core
  library: executable-stories-jest
  library_version: "8.7.0"
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

Full option surface (all formatter fields, output modes) and worker-file mechanics: [REFERENCE.md](REFERENCE.md).

Every run also updates `<outputDir>/by-file/`, one canonical report per test source.
Documentation formats render that accumulated suite; JUnit, Cucumber, and release
manifests describe only the current execution. Jest detects `testNamePattern`
automatically. Full runs may retire missing scenarios, filtered runs merge, and files
whose collection failed preserve their earlier scenarios with a warning.

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

Without options, the default format is `["html"]`. Use the tuple form `[path, options]` to specify formats and output directory.

Source: packages/executable-stories-jest/src/reporter.ts

### MEDIUM Default format is html, not markdown

The default `formats` is `["html"]`. Always specify `formats: ["markdown"]` (or other desired formats) explicitly.

Source: packages/executable-stories-jest/src/reporter.ts
