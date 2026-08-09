---
title: Playwright reporter options
description: Every option for StoryReporter in Playwright
---

In `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    [
      'executable-stories-playwright/reporter',
      {
        /* options */
      },
    ],
  ],
});
```

## Options reference

The reporter uses `FormatterOptions` from `executable-stories-formatters`. Same core options as [Vitest reporter options](/reference/vitest-config/).

### Output configuration

| Option       | Type             | Default                  | Description                                                           |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------------------------- |
| `formats`    | `OutputFormat[]` | `["cucumber-json"]`      | Output formats: `"markdown"`, `"html"`, `"junit"`, `"cucumber-json"`, `"cucumber-messages"`, `"cucumber-html"`. |
| `outputDir`  | `string`         | `"reports"`              | Base directory for output files.                                      |
| `outputName` | `string`         | `"test-results"`         | Base filename (without extension).                                    |
| `outputNameTimestamp` | `boolean` | `false`                | Append a UTC timestamp suffix to the output filename.                 |
| `output`     | `OutputConfig`   | `{ mode: "aggregated" }` | Output routing configuration.                                         |
| `rawRunPath` | `string`         | —                        | Write the raw run JSON to disk for later CLI use.                     |

### OutputConfig

| Field            | Type                            | Default        | Description                                                   |
| ---------------- | ------------------------------- | -------------- | ------------------------------------------------------------- |
| `mode`           | `"aggregated"` \| `"colocated"` | `"aggregated"` | Single file vs one file per source.                           |
| `colocatedStyle` | `"mirrored"` \| `"adjacent"`    | `"mirrored"`   | Colocated: mirrored under `outputDir` or next to source file. |
| `rules`          | `OutputRule[]`                  | `[]`           | Pattern-based overrides (first match wins).                   |

### Markdown options

Nested under `markdown`. See [Vitest config](/reference/vitest-config/#markdown-options) for full list.

The same top-level filtering, history, and notification options are also available in Playwright reporter config.

## Examples

### Aggregated markdown

```typescript
[
  'executable-stories-playwright/reporter',
  {
    formats: ['markdown'],
    outputDir: 'docs',
    outputName: 'user-stories',
    output: { mode: 'aggregated' },
    markdown: {
      title: 'User Stories',
      includeStatusIcons: true,
      includeMetadata: true,
    },
  },
];
```

### Multiple formats

```typescript
[
  'executable-stories-playwright/reporter',
  {
    formats: ['markdown', 'html', 'cucumber-json'],
    outputDir: 'reports',
    outputName: 'test-results',
    output: { mode: 'aggregated' },
  },
];
```

### Colocated output

```typescript
[
  'executable-stories-playwright/reporter',
  {
    formats: ['markdown'],
    outputDir: 'docs',
    output: {
      mode: 'colocated',
      colocatedStyle: 'mirrored',
    },
  },
];
```
