---
name: vitest-reporter-setup
description: >
  Use when configuring the StoryReporter in vitest.config.ts for
  executable-stories-vitest: OutputConfig, aggregated vs. colocated output
  modes, or GitHub Actions summary integration.
type: core
library: executable-stories-vitest
library_version: "8.4.7"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-vitest/src/reporter.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/vitest/vitest-config.md"
---

# executable-stories-vitest — Reporter Setup

## Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { createStoryReporter } from "executable-stories-vitest/reporter";

export default defineConfig({
  test: {
    reporters: [
      "default",
      createStoryReporter({
        formats: ["markdown", "html"],
        outputDir: "docs",
        outputName: "user-stories",
      }),
    ],
  },
});
```

Use the `createStoryReporter()` factory: it returns a correctly typed reporter, so you avoid the `new StoryReporter(...) as unknown as Reporter` cast.

Peer dependency: `executable-stories-formatters` must be installed.

Output-mode variants (colocated/aggregated), format-specific options, pattern-based rules, and raw-run output: [REFERENCE.md](REFERENCE.md).

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
createStoryReporter({ output: "docs/user-stories.md" })
```

Correct:

```typescript
createStoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  outputName: "user-stories",
})
```

The `output` property expects an `OutputConfig` object with `mode`, `colocatedStyle`, and `rules`. A string is silently treated as an object with all `undefined` fields, falling back to defaults.

Source: packages/executable-stories-vitest/src/reporter.ts

### MEDIUM Default format is html, not markdown

Wrong assumption:

```typescript
// Expecting markdown output
createStoryReporter({ outputDir: "docs" })
// → docs/index.html (not .md)
```

Correct:

```typescript
createStoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
})
```

The default format is `["html"]`, not `["markdown"]`. Always specify `formats` explicitly.

Source: packages/executable-stories-vitest/src/reporter.ts

See also: vitest-story-api/SKILL.md — Stories need the reporter to produce output
See also: formatters-cli/SKILL.md — Reporter produces RawRun that CLI consumes
