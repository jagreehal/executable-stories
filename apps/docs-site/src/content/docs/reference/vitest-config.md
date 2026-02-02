---
title: Vitest reporter options
description: Every option for StoryReporter in vitest.config
---

Use the **`/reporter`** subpath in your config so Vitest is not loaded in the config context:

```typescript
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter({ /* options */ })],
  },
});
```

## Options reference

Each option: **name**, **type**, **default**, **description**, **example**.

| Option | Type | Default | Description |
|--------|------|--------|-------------|
| `title` | `string` | `"User Stories"` | Report title (first line). |
| `description` | `string` | `""` | Optional description paragraph under the title. |
| `includeFrontMatter` | `boolean` | `false` | Include YAML front-matter for machine parsing. |
| `output` | `string \| OutputRule[]` | (colocated) | Single file path or array of rules. See below. |
| `permalinkBaseUrl` | `string` | — | Base URL for source links (e.g. GitHub blob). Adds "Source: [file](url)" under each scenario. |
| `enableGithubActionsSummary` | `boolean` | `true` | When `GITHUB_ACTIONS`, append report to job summary. |
| `includeSummaryTable` | `boolean` | `false` | Add summary table (start time, duration, scenario/step counts, passed/failed/skipped). |
| `includeMetadata` | `boolean` | `true` | Include metadata block (date, package version). |
| `metadata.date` | `"iso" \| "locale" \| false` | `"iso"` | Date format for metadata block. |
| `metadata.packageVersion` | `boolean` | `true` | Include package.json version in metadata. |
| `metadata.gitSha` | `boolean` | `true` | Include git SHA (short) in metadata. |
| `includeJson` | `boolean` | `false` | Emit a JSON report alongside Markdown. |
| `json.outputFile` | `string` | (same as Markdown with .json) | Output file path for JSON. |
| `json.includeDocs` | `"all" \| "static" \| "runtime"` | `"all"` | Include doc entries in JSON. |
| `coverage.include` | `boolean` | `false` | Include coverage summary (reads coverage-final.json). |
| `coverage.file` | `string` | `"coverage/coverage-final.json"` | Path to coverage file. |
| `groupBy` | `"file" \| "none"` | `"file"` | How to group scenarios. |
| `scenarioHeadingLevel` | `2 \| 3 \| 4` | 3 when groupBy=file, 2 when none | Heading level for scenario titles. |
| `stepStyle` | `"bullets" \| "gherkin"` | `"bullets"` | Step rendering style. |
| `markdown` | `"gfm" \| "commonmark" \| "confluence"` | `"gfm"` | Markdown dialect (indentation for nested blocks). |
| `includeStatus` | `boolean` | `true` | Include status icons on scenarios (e.g. ✅ ⚠️). |
| `includeDurations` | `boolean` | `false` | Include duration in markdown output. |
| `includeErrorInMarkdown` | `boolean` | `true` | Include failure error in markdown for failed scenarios. |
| `includeEmpty` | `boolean` | `true` | Include outputs even when there are no matched scenarios. |
| `sortFiles` | `"alpha" \| "source" \| "none"` | `"alpha"` | Sort files in markdown output. |
| `sortScenarios` | `"alpha" \| "source" \| "none"` | `"alpha"` | Sort scenarios in markdown output. |
| `filter.includeTags` | `string[]` | — | Only include scenarios with these tags. |
| `filter.excludeTags` | `string[]` | — | Exclude scenarios with these tags. |
| `filter.includeFiles` | `string \| string[]` | — | Glob(s) to include test files. |
| `filter.excludeFiles` | `string \| string[]` | — | Glob(s) to exclude test files. |
| `includeSourceLinks` | `boolean` | `true` | Include source links when permalinkBaseUrl is set. |
| `ticketUrlTemplate` | `string` | — | URL template for ticket links. Use `{ticket}` as placeholder. |
| `customRenderers` | `Record<string, CustomDocRenderer>` | — | Custom renderers for `doc.custom()` entries, keyed by type. |

## Output configuration

**Single aggregated file:**

```typescript
new StoryReporter({ output: "docs/user-stories.md" })
```

**Colocated** (default when `output` is omitted): write a `.docs.md` file next to each test file.

**Multiple rules:**

```typescript
new StoryReporter({
  output: [
    { include: "src/features/**/*.story.test.ts", mode: "aggregated", outputFile: "docs/features.md" },
    { include: "src/e2e/**/*.story.test.ts", mode: "colocated", extension: ".story.docs.md" },
  ],
})
```

## Example with common options

```typescript
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: [
      "default",
      new StoryReporter({
        title: "User Stories",
        output: "docs/user-stories.md",
        includeSummaryTable: true,
        includeMetadata: true,
        permalinkBaseUrl: "https://github.com/your-org/your-repo/blob/main/",
      }),
    ],
  },
});
```
