---
title: Formatting and metadata
description: Reporter options for title, description, front-matter, Markdown dialect, filters, and JSON
---

The reporter supports options that control **title**, **description**, **front-matter**, **Markdown dialect**, **metadata block**, **filtering**, **sorting**, and **JSON output**. This guide summarizes the main ones; the full option list is in each framework’s reference.

Under the hood, framework reporters use the **`executable-stories-formatters`** package to produce Markdown and other formats. For **programmatic** report generation (custom scripts, multiple formats, or CI tooling), see the [Formatters API](../reference/formatters-api/) reference.

## Title and description

- **`title`** — Report title (e.g. first line `# User Stories`). Default: `"User Stories"`.
- **`description`** — Optional paragraph under the title (framework/reporter dependent).

## Front-matter and Markdown dialect

- **`includeFrontMatter`** — When `true`, the reporter adds YAML front-matter to the Markdown (report metadata and counts) for machine parsing.
- **`markdown`** — Dialect used for rendering: `"gfm"` | `"commonmark"` | `"confluence"`. Affects nested indentation (e.g. GFM/CommonMark use 4 spaces under list items).

## Metadata block

- **`includeMetadata`** — When `true`, the report can include a metadata block (date, version, git SHA).
- **`metadata`** — Fine-grained control:
  - **`date`** — `"iso"` | `"locale"` | `false`
  - **`packageVersion`** — Include project version from `package.json`
  - **`gitSha`** — From `GITHUB_SHA` or the nearest `.git` directory (shortened)

Paths and source links are relative to the config root (project root). **`includeSourceLinks`** uses **`permalinkBaseUrl`** when set; see [CI and source links](./ci-and-source-links).

## Filtering and sorting

- **`filter`** — Include/exclude by tags or files, e.g.:
  - `includeTags: ["smoke"]`, `excludeTags: ["wip"]`
  - `includeFiles: ["src/**"]`, `excludeFiles: ["**/*.skip.*"]`
- **`sortFiles`** — `"alpha"` | `"source"` | `"none"` for file groups.
- **`sortScenarios`** — `"alpha"` | `"source"` | `"none"` for scenarios within a file.

## JSON output

- **`includeJson`** — When `true`, the reporter writes a JSON report (e.g. alongside the Markdown, same path with `.json` extension).
- **`json`** — Options such as:
  - **`outputFile`** — Override path for the JSON report (if supported).
  - **`includeDocs`** — `"all"` | `"static"` | `"runtime"` for which doc entries to include.

JSON metadata typically includes **`repoRoot`** (relative to the current working directory). You can then use the [collate CLI](./collating-reports) to merge multiple JSON reports into one index.

## Other useful options

- **`includeDurations`** — Include per-scenario durations in the Markdown (if supported).
- **`includeEmpty`** — Write output even when no scenarios matched.
- **`includeSummaryTable`** — Add a markdown table with start time, duration, story/step counts, and passed/failed/skipped.
- **`coverage`** — When `coverage.include` is true, the reporter can add a coverage summary (reads `coverage/coverage-final.json` or framework-specific hooks). On Vitest 4+, set `coverage.include` in the Vitest config if you want coverage in the report.

## Where to set options

- **Jest** — In `reporters`: `["executable-stories-jest/reporter", { title: "...", ... }]`.
- **Vitest** — In `new StoryReporter({ title: "...", ... })` in `vitest.config.ts`; import from `executable-stories-vitest/reporter`.
- **Playwright** — In the reporter entry: `["executable-stories-playwright/reporter", { title: "...", ... }]`.

For the **full option list** and framework-specific defaults, see:

- [Vitest reporter options](../reference/vitest-config/)
- [Jest reporter options](../reference/jest-config/)
- [Playwright reporter options](../reference/playwright-config/)
