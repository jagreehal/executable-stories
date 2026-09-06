---
name: vitest-reporter-setup
description: >
  Use when configuring the StoryReporter in vitest.config.ts for
  executable-stories-vitest: OutputConfig, aggregated vs. colocated output
  modes, or GitHub Actions summary integration.
metadata:
  type: core
  library: executable-stories-vitest
  library_version: "8.8.4"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-vitest/src/reporter.ts"
    - "jagreehal/executable-stories:apps/docs-site/src/content/docs/vitest/vitest-config.md"
---

# executable-stories-vitest — Reporter Setup

Works with Vitest 4 and Vitest 5, from the declared floor of 4.1.5 upward; both
are covered by CI. The reporter reads the same runner contract on each, so the
setup below is identical. On Vitest 5, Node >= 22.12 and Vite >= 6.4 are
required by Vitest itself.

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

`executable-stories-formatters` ships as a dependency of this package, so there is nothing extra to install.

Output-mode variants (colocated/aggregated), format-specific options, pattern-based rules, and raw-run output: [REFERENCE.md](REFERENCE.md).

Every run also updates `<outputDir>/by-file/`, one canonical report per test source.
Documentation formats render that accumulated suite; JUnit, Cucumber, and release
manifests describe only the current execution. Vitest detects `testNamePattern`
automatically. Full runs may retire missing scenarios, filtered runs merge, and files
whose collection was incomplete preserve their earlier scenarios with a warning.

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
