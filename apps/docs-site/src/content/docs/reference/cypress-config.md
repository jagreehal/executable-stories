---
title: Cypress reporter options
description: Reporter and Module API options for executable-stories-cypress
---

Cypress does not use a config-based reporter in the same way as Vitest or Playwright. You generate reports in one of two ways:

## Mocha reporter

When Cypress runs, it uses Mocha under the hood. You can pass the executable-stories reporter and options:

```bash
cypress run --reporter executable-stories-cypress/reporter --reporter-options outputDir=docs,outputName=user-stories
```

Reporter options match **FormatterOptions** from `executable-stories-formatters`. See [Vitest reporter options](/reference/vitest-config/) for the full option list (output configuration, filtering, markdown options, html, junit, history, notifications, and more).

## Module API

After `cypress.run()`, build a raw run and generate reports programmatically:

```typescript
import cypress from 'cypress';
import {
  buildRawRunFromCypressResult,
  generateReportsFromRawRun,
} from 'executable-stories-cypress/reporter';

const result = await cypress.run();
const rawRun = buildRawRunFromCypressResult(result, {
  projectRoot: process.cwd(),
});
await generateReportsFromRawRun(rawRun, {
  formats: ['markdown', 'html'],
  outputDir: 'docs',
  outputName: 'user-stories',
  output: { mode: 'aggregated' },
});
```

Options are the same **FormatterOptions** used by the other framework reporters: `formats`, `outputDir`, `outputName`, `output`, `markdown`, `html`, `junit`, `cucumberJson`, `cucumberMessages`, `history`, `notification`, and so on.

## Options reference

| Option                | Type             | Default                  | Description                                                                                                     |
| --------------------- | ---------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `formats`             | `OutputFormat[]` | `["html"]`               | Output formats: `"markdown"`, `"html"`, `"junit"`, `"cucumber-json"`, `"cucumber-messages"`, `"cucumber-html"`. |
| `outputDir`           | `string`         | `"reports"`              | Base directory for output files.                                                                                |
| `outputName`          | `string`         | `"index"`                | Base filename (without extension).                                                                              |
| `outputNameTimestamp` | `boolean`        | `false`                  | Append a UTC timestamp suffix to the output filename.                                                           |
| `output`              | `OutputConfig`   | `{ mode: "aggregated" }` | Output routing configuration.                                                                                   |

For **OutputConfig**, **markdown**, **html**, and other nested options, see [Vitest reporter options](/reference/vitest-config/).

Every run writes `raw-run.json` for the current execution and updates canonical per-source reports under `<outputDir>/by-file/`. Documentation formats render that directory; JUnit, Cucumber, and release-manifest formats contain only the current execution. Cypress cannot infer external title filters such as `@cypress/grep`, so pass `runScope: "filtered"` when narrowed, or `"full"` only when the run covered every scenario in its specs.
