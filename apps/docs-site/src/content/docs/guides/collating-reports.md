---
title: Collating reports
description: Merging JSON or Markdown reports into a single index
---

When you enable **`includeJson`** in the reporter (or use **`includeFrontMatter: true`** for Markdown), each run can write JSON files or Markdown with front-matter. **Collating** means merging those files into a **single index** (e.g. one JSON manifest) for dashboards, CI, or tooling.

## Current options

A dedicated **collate CLI** (e.g. `executable-stories-jest collate`, `executable-stories-vitest collate`) is **not** currently provided by the framework packages or the formatters package. To build a combined index today you can:

1. **Programmatic merge** — Use the reporter’s JSON output (or Markdown with front-matter) and write a small script that:
   - Globs the report files (e.g. `docs/**/*.json` or `**/*.docs.json`).
   - Reads and parses each file.
   - Merges metadata (e.g. scenario lists, file paths, timestamps) into a single JSON structure and writes it to a file (e.g. `docs/story-index.json`).

2. **Formatters** — If you generate reports via [executable-stories-formatters](/reference/formatters-api/) (e.g. in CI), you already get aggregated or colocated output per run. For multi-project or multi-run aggregation, combine the formatters’ output (e.g. multiple `TestRunResult` or raw JSON files) in your own script and optionally produce a single index file.

## When collating is useful

- **Dashboards** — One index of all scenarios and metadata across files or runs.
- **CI** — Aggregate reports from multiple projects or workspaces into a single artifact.
- **Tooling** — Scripts that need a single JSON manifest of all story reports.

If you only use colocated Markdown and don’t need a combined index, you can skip this step.
