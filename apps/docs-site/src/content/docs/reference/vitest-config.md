---
title: Vitest reporter options
description: Every option for StoryReporter in vitest.config
---

Use the **`/reporter`** subpath in your config so Vitest is not loaded in the config context:

```typescript
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: [
      'default',
      new StoryReporter({
        /* options */
      }),
    ],
  },
});
```

## Options reference

The reporter uses `FormatterOptions` from `executable-stories-formatters`. All options are optional. When you pass no options, the formatters package defaults apply (e.g. `formats: ["cucumber-json"]`, `outputDir: "reports"`). To get Markdown written to `docs/user-stories.md`, pass options explicitly as in the examples below.

### Output configuration

| Option       | Type             | Default                  | Description                                                           |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------------------------- |
| `formats`    | `OutputFormat[]` | `["cucumber-json"]`      | Output formats: `"markdown"`, `"html"`, `"junit"`, `"cucumber-json"`. |
| `outputDir`  | `string`         | `"reports"`              | Base directory for output files.                                      |
| `outputName` | `string`         | `"test-results"`         | Base filename (without extension).                                    |
| `output`     | `OutputConfig`   | `{ mode: "aggregated" }` | Output routing configuration.                                         |

### OutputConfig

| Field            | Type                            | Default        | Description                                                   |
| ---------------- | ------------------------------- | -------------- | ------------------------------------------------------------- |
| `mode`           | `"aggregated"` \| `"colocated"` | `"aggregated"` | Single file vs one file per source.                           |
| `colocatedStyle` | `"mirrored"` \| `"adjacent"`    | `"mirrored"`   | Colocated: mirrored under `outputDir` or next to source file. |
| `rules`          | `OutputRule[]`                  | `[]`           | Pattern-based overrides (first match wins).                   |

### Markdown options

Nested under `markdown`:

| Option                | Type                    | Default          | Description                                                   |
| --------------------- | ----------------------- | ---------------- | ------------------------------------------------------------- |
| `title`               | `string`                | `"User Stories"` | Report title.                                                 |
| `includeStatusIcons`  | `boolean`               | `true`           | Show ✅❌⏩ icons.                                            |
| `includeErrors`       | `boolean`               | `true`           | Show failure details.                                         |
| `includeMetadata`     | `boolean`               | `true`           | Show date/version/git SHA.                                    |
| `sortScenarios`       | `"alpha"` \| `"source"` | `"source"`       | Sort order for scenarios.                                     |
| `suiteSeparator`      | `string`                | `" - "`          | Separator for nested describes.                               |
| `includeFrontMatter`  | `boolean`               | `false`          | Include YAML front-matter.                                    |
| `includeSummaryTable` | `boolean`               | `false`          | Add summary statistics table.                                 |
| `permalinkBaseUrl`    | `string`                | —                | Base URL for source links (e.g. GitHub blob).                 |
| `ticketUrlTemplate`   | `string`                | —                | URL template for ticket links. Use `{ticket}` as placeholder. |

### Other format options

| Option         | Type                   | Description                                                              |
| -------------- | ---------------------- | ------------------------------------------------------------------------ |
| `html`         | `HtmlOptions`          | `title`, `darkMode`, `searchable`, `startCollapsed`, `embedScreenshots`. |
| `junit`        | `JUnitOptions`         | `suiteName`, `includeOutput`.                                            |
| `cucumberJson` | `{ pretty?: boolean }` | Pretty-print JSON output.                                                |

### Vitest-specific

| Option                       | Type      | Default | Description                                          |
| ---------------------------- | --------- | ------- | ---------------------------------------------------- |
| `enableGithubActionsSummary` | `boolean` | `true`  | When `GITHUB_ACTIONS`, append report to job summary. |

## Examples

### Aggregated markdown

```typescript
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: [
      'default',
      new StoryReporter({
        formats: ['markdown'],
        outputDir: 'docs',
        outputName: 'user-stories',
        output: { mode: 'aggregated' },
        markdown: {
          title: 'User Stories',
          includeStatusIcons: true,
          includeMetadata: true,
        },
      }),
    ],
  },
});
```

### Multiple formats

```typescript
new StoryReporter({
  formats: ['markdown', 'html', 'cucumber-json'],
  outputDir: 'reports',
  outputName: 'test-results',
  output: { mode: 'aggregated' },
});
```

### Colocated output

```typescript
new StoryReporter({
  formats: ['markdown'],
  outputDir: 'docs',
  output: {
    mode: 'colocated',
    colocatedStyle: 'mirrored', // Files mirror source structure under outputDir
  },
});
```

### Rule-based routing

```typescript
new StoryReporter({
  formats: ['markdown'],
  output: {
    mode: 'aggregated',
    rules: [
      {
        match: '**/*.story.test.ts',
        mode: 'colocated',
        colocatedStyle: 'adjacent',
      },
      { match: 'e2e/**', mode: 'aggregated', outputDir: 'docs/e2e' },
    ],
  },
});
```
