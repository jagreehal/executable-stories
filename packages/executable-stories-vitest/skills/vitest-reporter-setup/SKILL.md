---
name: vitest-reporter-setup
description: >
  Configure StoryReporter in vitest.config.ts for executable-stories-vitest.
  Import from executable-stories-vitest/reporter subpath. OutputConfig with
  formats, outputDir, outputName. Output modes: aggregated, colocated
  (mirrored/adjacent). Markdown, HTML, JUnit, Cucumber JSON options.
  GitHub Actions summary. rawRunPath for CLI consumption.
type: core
library: executable-stories-vitest
library_version: "7.0.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-vitest/src/reporter.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/vitest/vitest-config.md"
---

# executable-stories-vitest — Reporter Setup

## Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "executable-stories-vitest/reporter";

export default defineConfig({
  test: {
    reporters: [
      "default",
      new StoryReporter({
        formats: ["markdown", "html"],
        outputDir: "docs",
        outputName: "user-stories",
      }),
    ],
  },
});
```

Peer dependency: `executable-stories-formatters` must be installed.

## Core Patterns

### Output modes

```typescript
// Aggregated (default) — one file per format
new StoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  outputName: "user-stories",
  output: { mode: "aggregated" },
})
// → docs/user-stories.md

// Colocated mirrored — one file per source, directory mirrored
new StoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  output: { mode: "colocated", colocatedStyle: "mirrored" },
})
// test/auth/login.story.test.ts → docs/test/auth/login.story.md

// Colocated adjacent — written next to the test file
new StoryReporter({
  formats: ["markdown"],
  output: { mode: "colocated", colocatedStyle: "adjacent" },
})
// test/auth/login.story.test.ts → test/auth/login.story.md
```

### Format-specific options

```typescript
new StoryReporter({
  formats: ["markdown", "html", "junit", "cucumber-json"],
  outputDir: "reports",
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
    startCollapsed: false,
    embedScreenshots: true,
  },
  junit: {
    suiteName: "My Test Suite",
    includeOutput: true,
  },
  cucumberJson: { pretty: true },
})
```

### Pattern-based output rules

```typescript
new StoryReporter({
  formats: ["markdown"],
  output: {
    mode: "aggregated",
    rules: [
      {
        match: "test/api/**",
        mode: "colocated",
        colocatedStyle: "adjacent",
        formats: ["markdown", "html"],
      },
      {
        match: "test/e2e/**",
        outputDir: "docs/e2e",
        outputName: "e2e-stories",
      },
    ],
  },
})
```

### Raw run output for CLI

```typescript
new StoryReporter({
  formats: ["markdown"],
  rawRunPath: "reports/raw-run.json",
  enableGithubActionsSummary: true,
})
```

## Common Mistakes

### HIGH Importing StoryReporter from main package entry

Wrong:

```typescript
import { StoryReporter } from "executable-stories-vitest";
```

Correct:

```typescript
import { StoryReporter } from "executable-stories-vitest/reporter";
```

The main entry exports a guard class that throws at construction time. The real `StoryReporter` lives at the `/reporter` subpath to keep heavy formatter dependencies out of test code.

Source: packages/executable-stories-vitest/src/index.ts

### HIGH Passing a string instead of OutputConfig object

Wrong:

```typescript
new StoryReporter({ output: "docs/user-stories.md" })
```

Correct:

```typescript
new StoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  outputName: "user-stories",
})
```

The `output` property expects an `OutputConfig` object with `mode`, `colocatedStyle`, and `rules`. A string is silently treated as an object with all `undefined` fields, falling back to defaults.

Source: packages/executable-stories-vitest/src/reporter.ts

### MEDIUM Default format is cucumber-json, not markdown

Wrong assumption:

```typescript
// Expecting markdown output
new StoryReporter({ outputDir: "docs" })
// → docs/test-results.cucumber.json (not .md)
```

Correct:

```typescript
new StoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
})
```

The default format is `["cucumber-json"]`, not `["markdown"]`. Always specify `formats` explicitly.

Source: packages/executable-stories-vitest/src/reporter.ts

See also: vitest-story-api/SKILL.md — Stories need the reporter to produce output
See also: formatters-cli/SKILL.md — Reporter produces RawRun that CLI consumes
