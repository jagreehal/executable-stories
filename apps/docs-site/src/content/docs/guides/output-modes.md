---
title: Output modes
description: Colocated vs aggregated output, routing rules, and file naming
---

The reporter can write docs in two primary modes: **aggregated** (one combined file) or **colocated** (one file per source). You can also use **rules** to apply different modes to different paths.

## Modes at a glance

| Mode                     | Description                                   | Config                                                      |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| **Aggregated** (default) | All scenarios in one file                     | `output: { mode: "aggregated" }`                            |
| **Colocated mirrored**   | One file per source, mirrored under outputDir | `output: { mode: "colocated", colocatedStyle: "mirrored" }` |
| **Colocated adjacent**   | One file per source, next to test file        | `output: { mode: "colocated", colocatedStyle: "adjacent" }` |

## Output configuration

The `output` option configures routing:

```ts
interface OutputConfig {
  mode?: 'aggregated' | 'colocated'; // Default: "aggregated"
  colocatedStyle?: 'mirrored' | 'adjacent'; // Default: "mirrored"
  rules?: OutputRule[]; // Pattern-based overrides
}

interface OutputRule {
  match: string; // Glob pattern for sourceFile
  mode?: 'aggregated' | 'colocated';
  colocatedStyle?: 'mirrored' | 'adjacent';
  outputDir?: string;
  outputName?: string;
  formats?: OutputFormat[];
}
```

## Aggregated (default)

All scenarios combined into one file per format.

**Vitest:**

```ts
new StoryReporter({
  formats: ['markdown'],
  outputDir: 'docs',
  outputName: 'user-stories',
  output: { mode: 'aggregated' },
});
// Output: docs/user-stories.md
```

**Jest:**

```js
[
  'executable-stories-jest/reporter',
  {
    formats: ['markdown'],
    outputDir: 'docs',
    outputName: 'user-stories',
    output: { mode: 'aggregated' },
  },
];
```

**Playwright:**

```ts
[
  'executable-stories-playwright/reporter',
  {
    formats: ['markdown'],
    outputDir: 'docs',
    outputName: 'user-stories',
    output: { mode: 'aggregated' },
  },
];
```

## Colocated mirrored

One file per source file, directory structure mirrored under `outputDir`.

```ts
{
  formats: ["markdown"],
  outputDir: "docs",
  output: {
    mode: "colocated",
    colocatedStyle: "mirrored",
  },
}
// src/features/login.story.test.ts → docs/src/features/login.story.md
```

## Colocated adjacent

One file per source file, written next to the test file. **Ignores `outputDir`.**

```ts
{
  formats: ["markdown"],
  output: {
    mode: "colocated",
    colocatedStyle: "adjacent",
  },
}
// src/features/login.story.test.ts → src/features/login.story.md
```

## Rule-based routing

Apply different modes to different paths. **First matching rule wins.**

```ts
{
  formats: ["markdown"],
  outputDir: "docs",
  output: {
    mode: "aggregated",  // Default for unmatched files
    rules: [
      // Story tests: colocated next to source
      { match: "**/*.story.test.ts", mode: "colocated", colocatedStyle: "adjacent" },
      // E2E tests: aggregated into separate file
      { match: "e2e/**", mode: "aggregated", outputDir: "docs/e2e", outputName: "e2e-stories" },
    ],
  },
}
```

## Multiple formats

Generate multiple output formats from a single run:

```ts
{
  formats: ["markdown", "html", "cucumber-json", "junit"],
  outputDir: "reports",
  outputName: "test-results",
  output: { mode: "aggregated" },
}
// Output:
//   reports/test-results.md
//   reports/test-results.html
//   reports/test-results.cucumber.json
//   reports/test-results.junit.xml
```

## File extensions by format

| Format        | Extension        |
| ------------- | ---------------- |
| markdown      | `.md`            |
| html          | `.html`          |
| cucumber-json | `.cucumber.json` |
| junit         | `.junit.xml`     |

## Framework defaults

All frameworks default to:

- `formats: ["cucumber-json"]`
- `outputDir: "reports"`
- `outputName: "test-results"`
- `output: { mode: "aggregated" }`

Override any of these in your config. For markdown output, explicitly set `formats: ["markdown"]`.
