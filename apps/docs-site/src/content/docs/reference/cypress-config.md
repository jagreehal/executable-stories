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

Reporter options match **FormatterOptions** from `executable-stories-formatters`. See [Vitest reporter options](/reference/vitest-config/) for the full option list (output configuration, markdown options, html, junit, etc.).

## Module API

After `cypress.run()`, build a raw run and generate reports programmatically:

```typescript
import cypress from 'cypress';
import {
  buildRawRunFromCypressResult,
  generateReportsFromRawRun,
} from 'executable-stories-cypress/reporter';

const result = await cypress.run();
const rawRun = buildRawRunFromCypressResult(result, { projectRoot: process.cwd() });
await generateReportsFromRawRun(rawRun, {
  formats: ['markdown', 'html'],
  outputDir: 'docs',
  outputName: 'user-stories',
  output: { mode: 'aggregated' },
});
```

Options are the same **FormatterOptions** used by the other framework reporters: `formats`, `outputDir`, `outputName`, `output`, `markdown`, `html`, `junit`, `cucumberJson`, etc.

## Options reference

| Option       | Type             | Default                  | Description                                                           |
| ------------ | ---------------- | ------------------------ | --------------------------------------------------------------------- |
| `formats`    | `OutputFormat[]` | `["cucumber-json"]`      | Output formats: `"markdown"`, `"html"`, `"junit"`, `"cucumber-json"`. |
| `outputDir`  | `string`         | `"reports"`              | Base directory for output files.                                      |
| `outputName` | `string`         | `"test-results"`         | Base filename (without extension).                                    |
| `output`     | `OutputConfig`   | `{ mode: "aggregated" }` | Output routing configuration.                                         |

For **OutputConfig**, **markdown**, **html**, and other nested options, see [Vitest reporter options](/reference/vitest-config/).
