---
title: Vitest reporter options
description: Every option for StoryReporter in vitest.config
---

Supports Vitest 4 and Vitest 5, from the declared floor of 4.1.5 upward. The
reporter reads the same runner contract on both, so the options below apply
unchanged. On Vitest 5, Node >= 22.12 and Vite >= 6.4 are required by Vitest
itself.

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

The reporter uses `FormatterOptions` from `executable-stories-formatters`. All options are optional. When you pass no options, the formatters package defaults apply (`formats: ["html"]`, `outputDir: "reports"`, `outputName: "index"`). To get Markdown written to `docs/user-stories.md`, pass options explicitly as in the examples below.

### Output configuration

| Option       | Type             | Default                  | Description                                                           |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------------------------- |
| `formats`    | `OutputFormat[]` | `["html"]`               | Output formats: `"markdown"`, `"html"`, `"junit"`, `"cucumber-json"`, `"cucumber-messages"`, `"cucumber-html"`. |
| `outputDir`  | `string`         | `"reports"`              | Base directory for output files.                                      |
| `outputName` | `string`         | `"index"`                | Base filename (without extension).                                    |
| `outputNameTimestamp` | `boolean` | `false`                | Append a UTC timestamp suffix to the output filename.                 |
| `output`     | `OutputConfig`   | `{ mode: "aggregated" }` | Output routing configuration.                                         |

Every run also maintains one canonical JSON report per test source under
`<outputDir>/by-file/`. The `output` option routes rendered views; it does not change that
storage boundary. Documentation formats render accumulated state, while JUnit, Cucumber,
and release manifests contain only the current execution. Vitest detects name filtering
and incomplete collection automatically before deciding whether missing scenarios may be retired.

### OutputConfig

| Field            | Type                            | Default        | Description                                                   |
| ---------------- | ------------------------------- | -------------- | ------------------------------------------------------------- |
| `mode`           | `"aggregated"` \| `"colocated"` | `"aggregated"` | Single file vs one file per source.                           |
| `colocatedStyle` | `"mirrored"` \| `"adjacent"` \| `"flat"` | `"mirrored"` | Colocated: mirrored under `outputDir`, next to source, or directly under `outputDir` with a clean name. |
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
| `traceUrlTemplate`    | `string`                | —                | URL template for trace links. Use `{traceId}` as placeholder. |
| `includeSourceLinks`  | `boolean`               | `true`           | Include source links when `permalinkBaseUrl` is set.          |

### Filtering, history, and notifications

Top-level `FormatterOptions` also support:

- `include` / `exclude` for filtering by `sourceFile`
- `includeTags` / `excludeTags` for filtering by story tags
- `history.filePath` and `history.maxRuns` for HTML flakiness, stability, and performance trends
- `notification.*` for Slack, Teams, and generic webhook notifications

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
| `rawRunPath`                 | `string`  | —       | Write the raw run JSON to disk for later CLI use.    |

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
