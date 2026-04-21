---
name: formatters-cli
description: >
  executable-stories CLI: format, compare, list, validate, init-astro, and
  Atlassian publish subcommands. Pipeline: RawRun JSON from stdin or file,
  canonicalizeRun() normalization, and 8 output formats (Astro, Confluence,
  HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages). fn(args, deps)
  dependency injection. Exit codes 0=success, 1=schema, 2=canonical,
  3=generation, 4=usage. ReportGenerator and publish API. Aggregated and
  colocated output modes. canonicalizeRun, assertValidRun, validateCanonicalRun.
type: core
library: executable-stories-formatters
library_version: "0.7.8"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/cli.ts"
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/index.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/reference/formatters-api.md"
---

# executable-stories-formatters — CLI & API

## Setup

```bash
npm install -D executable-stories-formatters
```

### CLI usage

```bash
# Generate markdown from raw run JSON
executable-stories format raw-run.json --format markdown --output-dir docs

# Generate multiple formats
executable-stories format raw-run.json --format html,markdown,junit

# Read from stdin
cat raw-run.json | executable-stories format --stdin --format markdown

# Compare two canonical runs for review-friendly output
executable-stories compare baseline.json current.json \
  --input-type canonical \
  --format html,markdown \
  --output-name review-diff

# Validate JSON against schema
executable-stories validate raw-run.json

# Scaffold Starlight docs site for themed story output
executable-stories init-astro story-docs

# Publish ADF to Atlassian (dry run first)
executable-stories publish-confluence reports/test-results.adf.json --page-id 12345 --dry-run
executable-stories publish-jira reports/test-results.adf.json --issue PROJ-123 --mode comment --dry-run
```

### Programmatic usage

```typescript
import {
  canonicalizeRun,
  ReportGenerator,
} from "executable-stories-formatters";

const rawRun = JSON.parse(await readFile("raw-run.json", "utf-8"));
const canonical = canonicalizeRun(rawRun);

const generator = new ReportGenerator({
  formats: ["markdown", "html"],
  outputDir: "docs",
  outputName: "user-stories",
  outputNameTimestamp: true,   // optional: unique filenames per run (e.g. user-stories-1739123456.md)
  sortTestCases: "id",        // optional: stable order for diff-friendly reports
});

const outputs = await generator.generate(canonical);
// Map<OutputFormat, string[]> — file paths written per format
```

## Core Patterns

### Three-layer pipeline

```
Test code (story.given/when/then)
  → Framework adapter (vitest/jest/playwright/cypress)
    → RawRun JSON (schemaVersion: 1)
      → canonicalizeRun() → TestRunResult
        → Formatters (Astro, Confluence, HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages)
```

### Individual formatters

```typescript
import {
  canonicalizeRun,
  AstroFormatter,
  ConfluenceFormatter,
  MarkdownFormatter,
  HtmlFormatter,
  JUnitFormatter,
  CucumberJsonFormatter,
} from "executable-stories-formatters";

const canonical = canonicalizeRun(rawRun);

const md = new MarkdownFormatter().format(canonical);
const html = new HtmlFormatter().format(canonical);
const junit = new JUnitFormatter().format(canonical);
const cucumberJson = new CucumberJsonFormatter().formatToString(canonical);
const astro = new AstroFormatter().format(canonical);
const confluenceAdfJson = new ConfluenceFormatter().format(canonical);
```

### CLI flags

```bash
# Output control
--format html,markdown,junit,cucumber-json,cucumber-html,cucumber-messages,astro,confluence
--output-dir reports          # Base directory (default: reports)
--output-name test-results    # Base filename (default: test-results)
--output-name-timestamp       # Append run timestamp (UTC seconds) to filename for before/after diffs
--sort-test-cases id|source|none  # Deterministic scenario order (default: none). Use id for diff-friendly output
--input-type raw              # raw | canonical | ndjson

# Filtering
--include "test/api/**"       # Glob patterns to include
--exclude "test/fixtures/**"  # Glob patterns to exclude

# HTML options
--html-title "Test Report"
--html-no-syntax-highlighting
--html-no-mermaid
--html-no-markdown

# Story synthesis
--synthesize-stories          # Enabled by default
--no-synthesize-stories       # Disable

# Machine output
--json-summary                # Print JSON summary to stdout
--emit-canonical path.json    # Write canonical JSON

# Asset Bundling
--asset-mode none|copy        # Asset bundling strategy (default: none)
--allow-missing-assets        # Warn on missing assets instead of failing
```

### Atlassian publishing

```bash
# Confluence Cloud page publish (create or update)
executable-stories publish-confluence test-results.adf.json --page-id 12345
executable-stories publish-confluence test-results.adf.json --space-id ENG --title "Story Report"

# Jira Cloud publish (append comment or replace description)
executable-stories publish-jira test-results.adf.json --issue PROJ-123 --mode comment
executable-stories publish-jira test-results.adf.json --issue PROJ-123 --mode description
```

Environment variables are supported for credentials and base URL:

- Confluence: `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_TOKEN`
- Jira: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`

## Asset Bundling

Use `--asset-mode copy` to produce a portable report directory. All locally-referenced assets
(Playwright videos, screenshots, attachment files) are copied into an `assets/` subdirectory
and HTML paths are rewritten.

```bash
executable-stories format raw-run.json --format html --output-dir report --asset-mode copy
```

Output:
```
report/
  test-results.html   # paths rewritten to assets/
  assets/
    video-3f2c1a7b.webm
    step-1-91ab22de.png
```

### GitHub Actions usage

```yaml
- run: npx executable-stories format .executable-stories/raw-run.json --format html --output-dir report --asset-mode copy
- uses: actions/upload-artifact@v4
  with:
    name: test-report
    path: report/
```

### Options

| Flag | Description |
|------|-------------|
| `--asset-mode none` | Default. No asset bundling. |
| `--asset-mode copy` | Copy local assets to `assets/`, rewrite paths. |
| `--allow-missing-assets` | Warn on missing assets instead of failing. |

### Validation

```typescript
import {
  canonicalizeRun,
  validateCanonicalRun,
  assertValidRun,
} from "executable-stories-formatters";

const canonical = canonicalizeRun(rawRun);

// Returns { valid: boolean, errors: string[] }
const result = validateCanonicalRun(canonical);

// Throws if invalid
assertValidRun(canonical);
```

### Before/after diffs (evolution of tests)

To compare reports across runs (e.g. in CI or locally), use timestamped filenames and deterministic ordering so diffs show real changes instead of random reordering from parallel test execution:

```bash
executable-stories format raw-run.json --format markdown,html \
  --output-name-timestamp \
  --sort-test-cases id
```

- `--output-name-timestamp`: appends run start time in UTC seconds (e.g. `test-results-1739123456.md`), so each run produces a unique, chronologically sortable file.
- `--sort-test-cases id`: sorts scenarios by deterministic id (hash of source file + scenario name) so report content order is stable across runs.

Programmatic: set `outputNameTimestamp: true` and `sortTestCases: "id"` (or `"source"` for file/line order) on `FormatterOptions`.

For first-class run comparisons, use the dedicated compare subcommand:

```bash
executable-stories compare baseline.json current.json \
  --input-type canonical \
  --format html,markdown \
  --output-dir reports \
  --output-name test-results-diff
```

- Generates a standalone HTML review report with filter chips for `Regressed`, `Fixed`, `Added`, `Removed`, and `Changed`.
- Generates Markdown with per-scenario before/after summaries for PR discussion or artifact storage.
- Use canonical input when you already persist prior runs; raw and ndjson inputs are also supported as long as both files use the same `--input-type`.

### Notifications

```bash
executable-stories format raw-run.json \
  --format markdown \
  --slack-webhook "$SLACK_WEBHOOK_URL" \
  --notify on-failure \
  --report-url "https://ci.example.com/reports" \
  --max-failed-tests 5
```

## Common Mistakes

### HIGH Passing invalid RawRun JSON

Wrong:

```json
{ "tests": [{ "name": "my test" }] }
```

Correct:

```json
{
  "schemaVersion": 1,
  "metadata": { "startedAt": "2024-01-01T00:00:00Z" },
  "testCases": [
    {
      "id": "test-1",
      "name": "my test",
      "sourceFile": "test/example.test.ts",
      "status": "passed"
    }
  ]
}
```

The CLI validates against the RawRun schema. Invalid input exits with code 1. The `schemaVersion`, `metadata`, and `testCases` fields are required.

Source: packages/executable-stories-formatters/src/cli.ts

### MEDIUM Tests without story metadata silently filtered

```typescript
// This test has no story.init() — it will be excluded from reports
it("adds numbers", () => {
  expect(add(2, 3)).toBe(5);
});
```

`canonicalizeRun()` filters out test cases where `story == null` by default. Use `--synthesize-stories` (enabled by default) to include non-story tests with synthesized metadata, or add `story.init()` to your tests.

Source: packages/executable-stories-formatters/src/index.ts

### MEDIUM Exit codes not checked in CI

```bash
# Wrong — ignores failures
executable-stories format raw-run.json --format markdown || true
```

```bash
# Correct — CI fails on error
executable-stories format raw-run.json --format markdown
# Exit 0: success
# Exit 1: schema validation failure
# Exit 2: canonical validation failure
# Exit 3: formatter/generation failure
# Exit 4: bad arguments
```

Source: packages/executable-stories-formatters/src/cli.ts
