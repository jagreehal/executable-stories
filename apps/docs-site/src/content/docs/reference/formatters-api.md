---
title: Formatters API
description: Programmatic report generation with executable-stories-formatters
---

The **`executable-stories-formatters`** package provides a programmatic API to turn test results into reports. It supports **Cucumber JSON**, **HTML**, **JUnit XML**, and **Markdown**. Framework reporters (Vitest, Jest, Playwright) use this package under the hood; you can also use it directly in custom scripts or CI pipelines.

## Installation

Add the formatters package as a dependency (it is typically used alongside a framework package):

```bash
pnpm add -D executable-stories-formatters
```

If you only need adapters in a separate build, you can use the **`/adapters`** subpath:

```ts
import { adaptJestRun, adaptVitestRun, adaptPlaywrightRun } from "executable-stories-formatters/adapters";
```

## Architecture

Three layers:

1. **Adapters** — Convert framework-specific results to a raw run (`RawRun`).
2. **Anti-Corruption Layer (ACL)** — Normalize to a canonical `TestRunResult` via `canonicalizeRun`.
3. **Formatters** — Turn `TestRunResult` into Cucumber JSON, HTML, JUnit, or Markdown.

The **ReportGenerator** class combines adapters + ACL + formatters: you feed it a canonical `TestRunResult` and options, and it writes files.

## Quick start

Normalize framework results, then generate reports:

```ts
import {
  normalizeVitestResults,
  ReportGenerator,
} from "executable-stories-formatters";

// After a Vitest run, you have testModules (from the reporter or custom harvest).
const run = normalizeVitestResults(testModules);

const generator = new ReportGenerator({
  formats: ["markdown", "cucumber-json"],
  outputDir: "reports",
  output: { mode: "aggregated" },
});

const written = await generator.generate(run);
// written.get("markdown") → ["reports/test-results.md"]
// written.get("cucumber-json") → ["reports/test-results.cucumber.json"]
```

Same idea for Jest or Playwright: use **`normalizeJestResults`** or **`normalizePlaywrightResults`** with the appropriate result shape, then **`ReportGenerator`**.

## Adapters

Adapters turn framework output into **`RawRun`** (input to the ACL).

| Adapter | Input | Usage |
| ------- | ----- | ----- |
| `adaptJestRun` | Jest aggregated result + story reports | `adaptJestRun(jestResults, storyReports, adapterOptions?)` |
| `adaptVitestRun` | Vitest test modules | `adaptVitestRun(testModules, adapterOptions?)` |
| `adaptPlaywrightRun` | Playwright test results | `adaptPlaywrightRun(testResults, adapterOptions?)` |

Adapter options are framework-specific (e.g. `projectRoot`, `startedAtMs`). See the package types for `JestAdapterOptions`, `VitestAdapterOptions`, `PlaywrightAdapterOptions`.

## Normalizers

Convenience functions that run **adapter + canonicalizeRun** in one step:

- **`normalizeJestResults(jestResults, storyReports, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`
- **`normalizeVitestResults(testModules, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`
- **`normalizePlaywrightResults(testResults, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`

Use these when you have framework results and want a canonical run for **ReportGenerator** or individual formatters.

## ReportGenerator

**ReportGenerator** accepts only a canonical **`TestRunResult`** (create it with normalizers or `canonicalizeRun(rawRun, options)`).

### Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `formats` | `OutputFormat[]` | `["cucumber-json"]` | Output formats: `"cucumber-json"`, `"html"`, `"junit"`, `"markdown"`. |
| `outputDir` | `string` | `"reports"` | Base directory for output files. |
| `outputName` | `string` | `"test-results"` | Base filename (without extension) for aggregated output. |
| `output` | `OutputConfig` | see below | Output routing (mode, colocated style, rules). |
| `cucumberJson` | `{ pretty?: boolean }` | `{ pretty: false }` | Cucumber JSON options. |
| `html` | `HtmlOptions` | — | Title, darkMode, searchable, startCollapsed, embedScreenshots. |
| `junit` | `JUnitOptions` | — | suiteName, includeOutput. |
| `markdown` | `MarkdownFormatterOptions` | — | title, includeStatusIcons, includeMetadata, includeErrors, scenarioHeadingLevel, stepStyle, groupBy, sortScenarios, includeFrontMatter, includeSummaryTable, permalinkBaseUrl, ticketUrlTemplate, includeSourceLinks, customRenderers. |

**OutputConfig:**

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `mode` | `"aggregated"` \| `"colocated"` | `"aggregated"` | Single file vs one file per source. |
| `colocatedStyle` | `"mirrored"` \| `"adjacent"` | `"mirrored"` | Colocated: mirrored under `outputDir` or next to source file. |
| `rules` | `OutputRule[]` | `[]` | Pattern-based overrides (first match wins). |
| `outputName` | `string` | — | Override base filename for rules. |

**OutputRule:** `match` (glob), `mode`, `colocatedStyle`, `outputDir`, `outputName`, `formats`.

### Output routing

- **Aggregated** — All test cases in one file per format under `outputDir` (e.g. `reports/test-results.md`).
- **Colocated mirrored** — One file per source file, directory structure mirrored under `outputDir`.
- **Colocated adjacent** — One file per source file, written next to the test file (ignores `outputDir` for that rule).

Rules allow different routing per path (e.g. `src/**` colocated, `e2e/**` aggregated).

### Generate

```ts
const generator = new ReportGenerator(options);
const result: Map<OutputFormat, string[]> = await generator.generate(run);
```

**result** maps each requested format to the list of written file paths.

## Individual formatters

You can use formatters without **ReportGenerator** if you already have a **`TestRunResult`**:

- **CucumberJsonFormatter** — `formatToString(run)` → string
- **HtmlFormatter** — `format(run)` → string
- **JUnitFormatter** — `format(run)` → string
- **MarkdownFormatter** — `format(run)` → string

Instantiate with the same options as in **ReportGenerator** (e.g. `MarkdownFormatterOptions` for Markdown).

## ACL and validation

- **`canonicalizeRun(rawRun, options?)`** — Normalize `RawRun` to `TestRunResult`. Options: `attachments`, `cucumber`, `defaults`.
- **`validateCanonicalRun(run)`** — Returns validation result; **`assertValidRun(run)`** throws if invalid.

Utilities: **`normalizeStatus`**, **`generateTestCaseId`**, **`generateRunId`**, **`slugify`**, **`deriveStepResults`**, **`mergeStepResults`**, **`resolveAttachment`**, **`resolveAttachments`**.

## Types

Key types exported:

- **Canonical:** `TestRunResult`, `TestCaseResult`, `TestCaseAttempt`, `StepResult`, `Attachment`, `TestStatus`, `CIInfo`, `CoverageSummary`
- **Raw:** `RawRun`, `RawStatus`, `RawAttachment`, `RawStepEvent`, `RawTestCase`, `RawCIInfo`
- **Cucumber JSON:** `IJsonFeature`, `IJsonScenario`, `IJsonStep`, `IJsonStepResult`, etc.
- **Options:** `FormatterOptions`, `ResolvedFormatterOptions`, `OutputFormat`, `OutputMode`, `ColocatedStyle`, `OutputRule`, `CanonicalizeOptions`, `MarkdownFormatterOptions`, `MarkdownRenderers`

## When to use

- **Framework reporters** — Vitest/Jest/Playwright reporters use this package to produce Markdown (and optionally other formats). You configure them in the framework config; no need to call the formatters API directly.
- **Custom scripts** — Harvest test results (e.g. from a framework API or JSON output), then call **normalize\*Results** and **ReportGenerator** to produce HTML, JUnit, or Cucumber JSON in addition to (or instead of) the built-in reporter.
- **CI / tooling** — Generate multiple formats from one run, or merge runs from multiple projects and then format once.

For reporter options (title, output path, front-matter, etc.) when using the framework reporter, see [Vitest reporter options](./vitest-config/), [Jest reporter options](./jest-config/), and [Playwright reporter options](./playwright-config/).

## CLI

The formatters package provides an **`executable-stories`** CLI for generating reports from JSON test results.

**Subcommands:**

- **`executable-stories format <file>`** — Read raw (or canonical) test results and generate reports. Use `--format` to choose one or more of: `html`, `cucumber-html`, `markdown`, `junit`, `cucumber-json`, `cucumber-messages`. Default format is `html`.
- **`executable-stories validate <file>`** — Validate a JSON file against the schema (no output generated).

**Filtering by source file:**

- **`--include <globs>`** — Comma-separated globs; only test cases whose `sourceFile` matches at least one pattern are included.
- **`--exclude <globs>`** — Comma-separated globs; test cases whose `sourceFile` matches any pattern are excluded (applied after include).

**HTML report options (all enabled by default):**

- **`--html-no-syntax-highlighting`** — Disable syntax highlighting in HTML.
- **`--html-no-mermaid`** — Disable Mermaid diagram rendering in HTML.
- **`--html-no-markdown`** — Disable Markdown parsing in HTML.

**Standalone binary:** From the formatters package directory, run `bun run compile` to build a single `executable-stories` binary. CI builds produce platform-specific binaries (e.g. `executable-stories-linux-x64`); the release workflow uploads multi-platform binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64) as the `formatters-binaries` artifact.
