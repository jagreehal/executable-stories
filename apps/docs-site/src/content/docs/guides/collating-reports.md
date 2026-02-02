---
title: Collating reports
description: Merge JSON or Markdown reports into a single index with the collate CLI
---

When you enable **`includeJson`** in the reporter, each report can write a JSON file (e.g. alongside the Markdown). The **collate** CLI merges those files (or Markdown with front-matter) into a **single index** for dashboards or tooling.

## Collate JSON reports

After a test run that writes JSON (e.g. `docs/**/*.json`), run:

```bash
jest-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

**Vitest:**

```bash
vitest-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

**Playwright:**

```bash
playwright-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

Use globs that match your actual output paths (e.g. `docs/**/*.json` or `**/*.docs.json`).

## Collate Markdown with front-matter

If you use **`includeFrontMatter: true`**, you can collate Markdown files instead:

```bash
jest-executable-stories collate --format md --glob "**/*.md" --out docs/story-index.json
```

Same for Vitest and Playwright: replace the package name. The output is still a single JSON index; the `--format md` option tells the CLI to read Markdown files and parse their front-matter.

## Config file

Use **`--config`** to load options from a JSON file:

```json
{
  "outFile": "docs/story-index.json",
  "patterns": ["**/*.json"],
  "format": "json"
}
```

```bash
jest-executable-stories collate --config collate.config.json
```

Supported fields typically include:

- **`outFile`** — Output path for the index.
- **`patterns`** — Glob pattern(s) for input files (e.g. `["**/*.json"]`).
- **`format`** — `"json"` or `"md"`.

Exact field names may differ slightly per package; check each package’s README or `collate --help` for details.

## When to use collate

- **Dashboards** — One index of all scenarios and metadata.
- **CI** — Aggregate reports from multiple projects or workspaces into a single artifact.
- **Tooling** — Scripts that need a single JSON manifest of all story reports.

If you only use colocated Markdown and don’t need a combined index, you can skip the collate step.
