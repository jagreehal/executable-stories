---
name: formatters-cli
description: >
  Generate HTML, Markdown, JUnit, and Cucumber reports from raw-run.json using
  the executable-stories CLI. Requires Node.js >= 22 and npm. Install with
  npm install -g executable-stories-formatters. Works with all language adapters
  (Go, Rust, Python, Ruby, JUnit5, xUnit) that produce raw-run.json output.
type: core
library: executable-stories-formatters
library_version: "0.7.3"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/cli.ts"
---

# executable-stories-formatters — CLI

The `executable-stories` CLI converts `raw-run.json` (produced by any language adapter) into HTML, Markdown, JUnit, and Cucumber reports.

## Prerequisites

The CLI is an npm package. You need **Node.js >= 22** installed, even if your tests are in Go, Rust, Python, Ruby, Kotlin, or C#.

## Installation

```bash
# Global install (recommended for non-JS projects)
npm install -g executable-stories-formatters

# Or use npx without installing
npx executable-stories-formatters format ...

# Or as a dev dependency in a JS/TS project
npm install -D executable-stories-formatters
```

After global install, the `executable-stories` command is available in your PATH.

## End-to-end workflow

Every language adapter writes a `raw-run.json` file after tests complete. The CLI turns that file into reports:

```
1. Run tests          → .executable-stories/raw-run.json
2. Run CLI            → reports/test-results.html, reports/test-results.md
```

### Example: Go project

```bash
go test ./...
# Produces .executable-stories/raw-run.json via RunAndReport(m) in TestMain

executable-stories format .executable-stories/raw-run.json \
  --format html,markdown \
  --output-dir reports \
  --output-name test-results
```

### Example: Python (pytest) project

```bash
pytest
# Produces .executable-stories/raw-run.json via pytest plugin

executable-stories format .executable-stories/raw-run.json \
  --format html,markdown \
  --output-dir reports
```

### Example: JUnit 5 (Kotlin/Java) project

```bash
./gradlew test
# Produces .executable-stories/raw-run.json via TestExecutionListener SPI

executable-stories format .executable-stories/raw-run.json \
  --format html,markdown \
  --output-dir reports
```

### Example: CI (GitHub Actions)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22

- run: npm install -g executable-stories-formatters

# Run your language-specific tests first, then:
- run: executable-stories format .executable-stories/raw-run.json --format html --output-dir report --asset-mode copy

- uses: actions/upload-artifact@v4
  with:
    name: test-report
    path: report/
```

## CLI reference

```bash
# Generate reports
executable-stories format <raw-run.json> --format <formats> [options]

# Available formats (comma-separated)
--format html,markdown,junit,cucumber-json,cucumber-html,cucumber-messages

# Output control
--output-dir reports          # Directory for output files (default: reports)
--output-name test-results    # Base filename (default: test-results)
--output-name-timestamp       # Append timestamp for unique filenames
--sort-test-cases id|source   # Deterministic order for diff-friendly output

# Read from stdin
cat raw-run.json | executable-stories format --stdin --format html

# HTML options
--html-title "Test Report"
--html-no-syntax-highlighting
--html-no-mermaid
--html-no-markdown

# Asset bundling (for portable reports)
--asset-mode copy             # Copy screenshots/videos into report directory
--allow-missing-assets        # Warn instead of fail on missing assets

# Validate JSON schema
executable-stories validate raw-run.json

# Compare two runs (before/after diff report)
executable-stories compare baseline.json current.json \
  --input-type canonical \
  --format html,markdown \
  --output-name review-diff
```

## Output path override

All language adapters default to `.executable-stories/raw-run.json`. Override with the `EXECUTABLE_STORIES_OUTPUT` environment variable:

```bash
EXECUTABLE_STORIES_OUTPUT=reports/raw-run.json go test ./...
EXECUTABLE_STORIES_OUTPUT=reports/raw-run.json pytest
```

## Common Mistakes

### CRITICAL Assuming the CLI is a pip/gem/maven package

Wrong:

```bash
pip install executable-stories-formatters   # Does not exist
gem install executable-stories-formatters   # Does not exist
```

Correct:

```bash
npm install -g executable-stories-formatters
# or: npx executable-stories-formatters format ...
```

The CLI is an npm package regardless of which language adapter you use. Node.js >= 22 is required.

### HIGH Not finding raw-run.json

If no `raw-run.json` file exists after running tests, the language adapter's output step is not configured:

| Language | Fix |
|----------|-----|
| Go | Add `func TestMain(m *testing.M) { es.RunAndReport(m) }` |
| Rust | Call `collector::write_results()` at end of test suite |
| Python | Ensure `executable-stories-pytest` is installed (plugin is automatic) |
| Ruby | Ensure `executable_stories` gem is installed (Minitest plugin is automatic) |
| JUnit 5 | Check SPI auto-discovery is not disabled in launcher config |
| xUnit | Call `Story.RecordAndClear()` at end of each test |

### MEDIUM Exit codes not checked in CI

```bash
# Exit 0: success
# Exit 1: schema validation failure
# Exit 2: canonical validation failure
# Exit 3: formatter/generation failure
# Exit 4: bad arguments
```
