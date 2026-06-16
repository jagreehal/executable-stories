---
name: formatters-cli
description: >
  executable-stories CLI: format, compare, gate-release, review, list, check,
  goal, triage, validate, init-astro, build-docs (living-docs portal:
  audience-split URLs, deep-link index, what's-changed page), and Atlassian
  publish subcommands.
  Pipeline: RawRun JSON from stdin or file, canonicalizeRun() normalization,
  and output formats (Astro, Confluence, HTML, Markdown, JUnit, Cucumber
  JSON/HTML/Messages, story-report-json, scenario-index-json,
  behavior-manifest-json, release-manifest, traceability-matrix). Agent-loop
  commands: check (backpressure signal), triage (worklist), goal
  (definition-of-done with ratchet). fn(args, deps) dependency injection.
  Exit codes 0=success, 1=schema, 2=canonical, 3=generation, 4=usage,
  5=compare/review/check/goal gate not met, 6=release gate. ReportGenerator and
  publish API. Aggregated and colocated output modes. canonicalizeRun,
  assertValidRun, validateCanonicalRun.
type: core
library: executable-stories-formatters
library_version: "0.15.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/cli.ts"
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/index.ts"
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/build-docs.ts"
  - "jagreehal/executable-stories:packages/executable-stories-formatters/src/scenario-links.ts"
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

# Build the living-docs site into a scaffolded Astro site (Explorer data,
# story pages, bundled assets, deep-link index, overview page)
executable-stories build-docs raw-run.json --site-dir story-docs

# Build the audience-categorized "portal" with a what's-changed page
executable-stories build-docs raw-run.json --site-dir story-docs \
  --audience-split \
  --baseline prev-story-report.json

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
        → Formatters (Astro, Confluence, HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages,
          release-manifest, traceability-matrix, story-report-json, scenario-index-json, behavior-manifest-json)
        → Agent-loop commands (check, triage, goal) read the same TestRunResult
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
--format html,markdown,junit,cucumber-json,cucumber-html,cucumber-messages,astro,confluence,release-manifest,traceability-matrix,story-report-json,scenario-index-json,behavior-manifest-json
--output-dir reports          # Base directory (default: reports)
--output-name index           # Base filename (default: index)
--output-name-timestamp       # Append run timestamp (UTC seconds) to filename for before/after diffs
--sort-test-cases id|source|none  # Deterministic scenario order (default: none). Use id for diff-friendly output
--input-type raw              # raw | canonical | ndjson
--config ./executable-stories.config.js  # Custom formats / config (default: ./executable-stories.config.js)

# Filtering
--include "test/api/**"       # Glob patterns to include (by sourceFile)
--exclude "test/fixtures/**"  # Glob patterns to exclude (by sourceFile)
--include-tags smoke,api      # Include test cases carrying any of these tags
--exclude-tags wip,flaky      # Exclude test cases carrying any of these tags

# HTML options
--html-title "Test Report"
--html-theme dashboard        # default | corporate | terminal | minimal | dashboard | playful
--html-theme-picker           # Embed all CSS-only themes with a live picker
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

### Living-docs portal (`build-docs`)

`build-docs` runs the whole living-docs pipeline in one step against a scaffolded Astro site (`init-astro` first). From a single raw run it writes, under the site:

- `public/stories/story-report.json` — StoryReport v1 (the Scenario Explorer's data)
- `public/stories/scenario-links.json` — **deep-link index** keyed by stable scenario id (`{ url, anchor, deepLink, audience, status }`); the contract external tools (Linear/Confluence/MCP) resolve against
- `src/content/docs/stories/**` — one browsable page per source file (assets bundled to `public/stories/assets`)
- `src/content/docs/stories/index.md` — **overview/landing** page with per-audience cards (pass/fail counts, failures-first deep links)
- with `--baseline`: `public/stories/changes.json` + `stories/changes.md` — **what's-changed** (added/removed/regressed/fixed), and 🆕/✅/⚠️ badges baked onto changed scenario pages

```bash
# Flat layout (default — backward-compatible URLs /stories/<file>/)
executable-stories build-docs raw-run.json --site-dir story-docs

# Portal: audience-categorized URLs /stories/<engineer|stakeholder>/<file>/
#   audience is derived (e2e/*.spec.* → stakeholder, else engineer; @audience:* tag overrides)
executable-stories build-docs raw-run.json --site-dir story-docs --audience-split

# Living portal: also emit the what's-changed page + per-scenario badges
executable-stories build-docs raw-run.json --site-dir story-docs \
  --audience-split --baseline prev-story-report.json
```

Flags & contracts:

- `--audience-split` is **opt-in** (default flat). Turning it on changes every page URL, so existing bookmarks/deep links to `/stories/<file>/` would 404 — enable it deliberately (the GitHub Action's `mode: portal` defaults it on).
- `--baseline <prev story-report.json>` is **strict**: a path that can't be read is a hard error (exit 4), never a silent "no changes". When a run produces no diff, any stale `changes.json`/`changes.md` from a prior run is removed.
- The exported `buildScenarioLinks()` helper defaults `audienceSplit: false`, matching the CLI — pass `{ audienceSplit: true }` when pages were generated with the split.
- Deploy the built site anywhere, or use the GitHub Action `mode: portal` (host-agnostic artifact, optional GitHub Pages).

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
executable-stories format raw-run.json --format html --output-dir reports --asset-mode copy
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
- run: npx executable-stories format .executable-stories/raw-run.json --format html --output-dir reports --asset-mode copy
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

### Other subcommands

`compare` (diff two runs), `gate-release` (verify an RC run against a dev baseline), `review` (Evidence Review of AI-authored changes vs the diff), and `deploy record|status|diff` (deployment ledger + environment drift) round out the CLI — run `executable-stories --help` for the full list and `<subcommand> --help` per command.

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
