---
title: Output modes
description: Per-source state, aggregated and colocated views, routing rules, and file naming
---

Every formatted run first updates canonical state one test source file at a time under `<outputDir>/by-file/`. Presentation is a separate choice: **aggregated** writes one combined view, while **colocated** writes one rendered page per source. Rules can route different paths differently without changing the storage boundary.

Execution evidence is separate again. JUnit, Cucumber, and release-manifest outputs describe only the run in hand; documentation formats render the accumulated suite.

## Modes at a glance

| Mode                     | Description                                   | Config                                                      |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| **Aggregated** (default) | All scenarios in one file                     | `output: { mode: "aggregated" }`                            |
| **Colocated mirrored**   | One file per source, mirrored under outputDir | `output: { mode: "colocated", colocatedStyle: "mirrored" }` |
| **Colocated adjacent**   | One file per source, next to test file        | `output: { mode: "colocated", colocatedStyle: "adjacent" }` |
| **Colocated flat**       | One cleanly-named page per source, directly under outputDir | `output: { mode: "colocated", colocatedStyle: "flat" }` |

## Output configuration

The `output` option configures routing:

```ts
interface OutputConfig {
  mode?: 'aggregated' | 'colocated'; // Default: "aggregated"
  colocatedStyle?: 'mirrored' | 'adjacent' | 'flat'; // Default: "mirrored"
  rules?: OutputRule[]; // Pattern-based overrides
}

interface OutputRule {
  match: string; // Glob pattern for sourceFile
  mode?: 'aggregated' | 'colocated';
  colocatedStyle?: 'mirrored' | 'adjacent' | 'flat';
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

| Format                 | Extension                |
| ---------------------- | ------------------------ |
| markdown               | `.md`                    |
| html                   | `.html`                  |
| cucumber-json          | `.cucumber.json`         |
| junit                  | `.junit.xml`             |
| story-report-json      | `.story-report.json`     |
| scenario-index-json    | `.scenario-index.json`  |
| behavior-manifest-json | `.behavior-manifest.json`|
| release-manifest       | `.release-manifest.md`   |
| traceability-matrix    | `.traceability-matrix.md`|

## Framework defaults

The CLI, `ReportGenerator`, and framework reporters default to:

- `formats: ["html"]`
- `outputDir: "reports"`
- `outputName: "index"`
- `output: { mode: "aggregated" }`

Override any of these in your config. For Markdown output, explicitly set `formats: ["markdown"]`.

## Running part of the suite

A test run reports only what it ran. `vitest run one-file`, `vitest -t "one scenario"` and the MCP `run_scenario` tool all cover a fraction of the suite, so a report rendered straight from one of them would drop everything else.

So the storage unit is the test source file, not the run. Each test file owns a report:

```
reports/
  by-file/
    src-checkout.story-report.json     one canonical run per test source file
    src-payments.story-report.json
  index.html                           a combined view, derived from those
```

Running one test file rewrites one report and leaves the rest alone. Nothing merges across files, and there is no hidden state: the files on disk are the state.

### Building a combined view

Point `format` at the directory:

```bash
executable-stories format reports/by-file --format html --output-dir reports
```

It reads whatever reports are there, orders them by source file, and renders. This is a pure read: it writes no reports and changes no timestamps, so looking cannot alter what the directory says. Your framework reporter does the same at the end of a run, so `pnpm test` still leaves you an `index.html`.

`junit`, `cucumber-json`, `cucumber-messages` and `cucumber-html` are the exception. They record what a build executed, so they always describe the run in hand rather than the accumulated suite: a focused run emits only the tests it ran, which is what a CI dashboard needs to be true.

The docs site reads the same directory (see [Astro docs site](/guides/astro-docs-site/#showing-the-whole-suite-not-just-the-last-run)).

### How old is each report

A combined view holds results from several runs, so its run-level timestamp does not speak for its contents. Every scenario records when it last ran and on which commit; the HTML report flags scenarios older than the staleness threshold (`--html-stale-after-days`, 7 by default), and the metadata table says the view is accumulated and over what span.

To see it per file:

```bash
executable-stories runs status
```

```
Reports in reports/by-file, one per test source file:

  src/checkout.story.test.ts  6 scenarios, last ran 12 days ago @ a1b2c3d4
  src/payments.story.test.ts  9 scenarios, last ran just now @ e5f6a7b8
```

The CLI also names how much of a combined view the run in hand produced:

```
✔ 27 scenarios (27 passed) → reports/index.md in 120ms
  1 from this run, 26 carried over from earlier runs
```

### Renamed and deleted scenarios

Scenario ids carry the title, so a rename looks like a new scenario. Retiring the old one is the only destructive act in the pipeline, so it needs certainty:

| The run says | What happens to scenarios it did not report |
| --- | --- |
| `runScope: "full"` — the adapter determined no name filter applied | Retired, with a warning naming each one |
| `runScope: "filtered"` — a name filter applied | Kept, silently. The run only saw part of the file. |
| nothing — the adapter cannot tell | Kept, with a warning naming each one |

Uncertainty preserves data and only certainty removes it, so incomplete detection leaves a stale report rather than deleting work. Adapters that can see their own filter report it; three cannot and take a declaration instead ([filtered runs](/reference/formatters-api/#filtered-runs)).

A report whose test file no longer exists on disk is removed outright: the file is gone, so its scenarios are gone.

### Housekeeping

`reports/by-file/` is ordinary output. Delete a file and its scenarios leave the combined view; delete the directory and the next full test run writes it again (`executable-stories runs reset` does the same).

Do not commit it. Each report carries a `runId` and per-step durations, so every run leaves a dirty tree, and a release gate like `git diff --exit-code` then fails forever while reading as though someone forgot to commit generated docs. Ignore it with `**/<outputDir>/by-file/` — the `**/` matters, since a bare `docs/by-file/` is anchored where it sits and will not match `packages/anything/docs/by-file/` in a monorepo. Most projects ignore the whole `reports/` folder, which covers this; a project that renders docs into a committed directory needs the line.

In CI it starts empty, which is why CI should run the full suite: that is the one place a complete run is worth insisting on.
