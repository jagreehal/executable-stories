---
name: formatters-cli
description: >
  Use when running the executable-stories CLI or formatters API: turning a
  RawRun into a report (Astro, Confluence, HTML, Markdown, JUnit, Cucumber,
  story-report-json, etc.), gating a release, comparing runs, reviewing
  AI-authored changes, or driving agent-loop commands (check/triage/goal).
type: core
library: executable-stories-formatters
library_version: "1.0.0"
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

# Scaffold a thin Astro docs site; run `astro dev` for live stories at /stories
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

Full CLI flag list, per-formatter programmatic API, asset bundling, Atlassian publishing, validation helpers, before/after diffs, and notifications: [REFERENCE.md](REFERENCE.md).

## Core Patterns

### Three-layer pipeline

```
Test code (story.given/when/then)
  → Framework adapter (vitest/jest/playwright/cypress)
    → RawRun JSON (schemaVersion: 1)
      → canonicalizeRun() → TestRunResult
        → Formatters (Astro, Confluence, HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages,
          release-manifest, traceability-matrix, story-report-json, scenario-index-json, behavior-manifest-json)
        → Agent-loop commands (check, triage, goal) read the same TestRunResult
```

## Agent loop commands

Three subcommands turn a run into signals a coding agent (or an unattended loop) can act on. They read the same RawRun/canonical JSON as `format`.

### check — backpressure signal (run after every change)

Compress success, expand failure. Passing scenarios collapse to a count; each failing scenario expands to its Given/When/Then, the failing step, the error, and the product code it `covers`.

```bash
executable-stories check .executable-stories/raw-run.json --baseline reports/previous.json
# --check-format json  → structured report
# --no-fail            → report only (always exit 0)
# exits 5 when any scenario failed, so an agent loop reacts before a human
```

### triage — discovery worklist (start of a loop)

Failing scenarios, regressions first, each with the code it `covers`, the error, and tickets. Failures with no `covers` are flagged. Always exits 0 (reports, does not gate).

```bash
executable-stories triage .executable-stories/raw-run.json --baseline reports/last-green.json --triage-format json
```

### goal — behavioral definition-of-done (loop stopping condition)

Met when the required scenarios pass, nothing regressed (`--no-regressions`), and no scenario was removed, disabled, or had steps deleted vs `--baseline` (the ratchet, on by default with a baseline — it blocks an agent from faking "done" by deleting the failing scenario). Exit 0 = met, 5 = not yet.

```bash
executable-stories goal raw-run.json --require-tickets US-101 --baseline prev.json --no-regressions
# selectors: --require-tags / --require-tickets / --require-scenarios (none → "all scenarios pass")
# --no-ratchet disables the removed/weakened guard; --goal-format json for machines
```

Put `check` and `goal` in `CLAUDE.md`/`AGENTS.md` so the loop runs them without being asked. See the docs guide "Agent loops and backpressure".

### list — scenario discovery / failure triage

```bash
executable-stories list raw-run.json --list-format json   # text (default) | json | csv | markdown-table
# supports --include-tags / --exclude-tags, --input-type, --stdin
```

The discovery index for agents and explorers — one scenario per line (text) or machine-parsable JSON. Use it for triage before reading source tests.

### watch — keep agent artifacts fresh

```bash
executable-stories watch raw-run.json --format story-report-json,scenario-index-json --output-dir reports
```

Regenerates the chosen reports whenever the raw-run file changes — keeps the live agent index (StoryReport JSON + scenario index) up to date during a coding loop without re-invoking `format` by hand.

Live-reloading docs during a loop (`init-astro` + `astro dev`, the `Trajectory` component) and the remaining subcommands (`compare`, `gate-release`, `review`, `deploy`): [REFERENCE.md](REFERENCE.md).

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
  "projectRoot": "/abs/path/to/project",
  "testCases": [
    {
      "title": "my test",
      "sourceFile": "test/example.test.ts",
      "status": "pass"
    }
  ]
}
```

The CLI validates against the RawRun schema (`additionalProperties: false`, so unknown keys are rejected). Invalid input exits with code 1. Required at the top level: `schemaVersion`, `testCases`, and `projectRoot`. On each test case only `status` is required; the human-readable name field is `title` (not `name`). Valid `status` values: `pass`, `fail`, `skip`, `todo`, `pending`, `timeout`, `interrupted`, `unknown`. For arbitrary runner data use the optional `meta` object — there is no top-level `metadata` field.

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
# Exit 5: compare/review/check gate failed, or goal not met
# Exit 6: release gate failed (gate-release)
```

Source: packages/executable-stories-formatters/src/cli.ts
