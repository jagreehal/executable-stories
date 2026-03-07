---
name: formatters-cli
description: >
  executable-stories CLI: format and validate subcommands. Pipeline: RawRun
  JSON from stdin or file, canonicalizeRun() normalization, 6 output formats
  (HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages). fn(args, deps)
  dependency injection. Exit codes 0=success, 1=schema, 2=canonical,
  3=generation, 4=usage. ReportGenerator programmatic API. Aggregated and
  colocated output modes. canonicalizeRun, assertValidRun, validateCanonicalRun.
type: core
library: executable-stories-formatters
library_version: "0.6.1"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/cli.ts"
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/index.ts"
  - "jagreehal/executable-stories:apps/docs-site/src/content/docs/formatters/formatters-api.md"
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

# Validate JSON against schema
executable-stories validate raw-run.json
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
        → Formatters (HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages)
```

### Individual formatters

```typescript
import {
  canonicalizeRun,
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
```

### CLI flags

```bash
# Output control
--format html,markdown,junit,cucumber-json,cucumber-html,cucumber-messages
--output-dir reports          # Base directory (default: reports)
--output-name test-results    # Base filename (default: test-results)
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
```

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
