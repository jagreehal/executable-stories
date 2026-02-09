---
title: Jest reporter options
description: Every option for StoryReporter in Jest
---

In `jest.config.js` or `jest.config.mjs`:

```javascript
export default {
  reporters: [
    'default',
    [
      'executable-stories-jest/reporter',
      {
        /* options */
      },
    ],
  ],
  setupFilesAfterEnv: ['executable-stories-jest/setup'],
};
```

## Options reference

The reporter uses `FormatterOptions` from `executable-stories-formatters`. Same options as [Vitest reporter options](/reference/vitest-config/).

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

Nested under `markdown`. See [Vitest config](/reference/vitest-config/#markdown-options) for full list.

## Examples

### Aggregated markdown

```javascript
[
  'executable-stories-jest/reporter',
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

```javascript
[
  'executable-stories-jest/reporter',
  {
    formats: ['markdown', 'html', 'cucumber-json'],
    outputDir: 'reports',
    outputName: 'test-results',
    output: { mode: 'aggregated' },
  },
];
```

### Colocated output

```javascript
[
  'executable-stories-jest/reporter',
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
