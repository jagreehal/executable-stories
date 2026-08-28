---
name: formatters-cli
description: >
  Use when running the executable-stories CLI or formatters API: turning a
  RawRun into a report (Astro, Confluence, HTML, Markdown, JUnit, Cucumber,
  story-report-json, etc.), gating a release, comparing runs, reviewing
  AI-authored changes, driving agent-loop commands (check/triage/goal), or
  sharing a run with a chat LLM (agent-text).
---

# executable-stories-formatters — CLI & API

## Setup

Sources of truth: `packages/executable-stories-formatters/src/cli.ts`,
`packages/executable-stories-formatters/src/index.ts`, and the docs-site
formatters API reference.

```bash
npm install -D executable-stories-formatters
```

### CLI usage

```bash
# The input file defaults to .executable-stories/raw-run.json, then
# reports/raw-run.json — so this works with no path in most projects
executable-stories format --format html

# Generate markdown from raw run JSON
executable-stories format raw-run.json --format markdown --output-dir docs

# Generate multiple formats
executable-stories format raw-run.json --format html,markdown,junit

# Requirement traceability for auditors. CSV includes evidence_grade.
executable-stories format raw-run.json --format traceability-matrix,traceability-csv

# Pasting a run into a chat LLM (a stakeholder asking ChatGPT "what does this
# product do?"): flat token-lean text, ~12x smaller than the HTML report.
# HTML pasted into a chat window silently truncates; agent-text fits.
executable-stories format raw-run.json --format agent-text

# Format presets, instead of remembering which of 15 formats you need:
#   agent -> story-report-json, scenario-index-json, behavior-manifest-json, agent-text
#   ci    -> junit, story-report-json
#   docs  -> html, markdown
executable-stories format --preset agent

# --preset unions with --format when both are given (preset is a starting
# point, not a lock) — this writes junit, story-report-json, AND html:
executable-stories format --preset ci --format html

# Open the HTML report when it's written (no-op with a warning if no html format)
executable-stories format --format html --open

# Diagnose the run JSON (location, parse, schema version vs CLI, contents).
# Use this FIRST when a non-JS adapter's output won't format: it names the
# cross-language version-drift case instead of failing deep in validation.
executable-stories doctor

# Read from stdin
cat raw-run.json | executable-stories format --stdin --format markdown

# Compare two canonical runs for review-friendly output
executable-stories compare baseline.json current.json \
  --input-type canonical \
  --format html,markdown \
  --output-name review-diff
# HTML adds a storyboard to regressed/fixed scenarios when their current
# step docs contain browser-renderable screenshots or state snapshots.

# Behavior changelog between two tagged runs + PR-comment summary
executable-stories compare v1.2-run.json v1.3-run.json \
  --format changelog --output-name release-1.3 \
  --pr-summary-file reports/pr-summary.md

# Persist run history: HTML gets per-scenario timelines, Flaky badges,
# and a "Since last run" strip in the header
executable-stories format raw-run.json --format html \
  --history-file .executable-stories/history.json

# Validate JSON against schema
executable-stories validate raw-run.json

# Scaffold a thin Astro docs site; run `astro dev` for live stories at /stories
executable-stories init-astro story-docs

# Shell completion
executable-stories completion zsh > ~/.zsh/completions/_executable-stories

# Publish ADF to Atlassian (dry run first)
executable-stories publish-confluence reports/test-results.adf.json --page-id 12345 --dry-run
executable-stories publish-jira reports/test-results.adf.json --issue PROJ-123 --mode comment --dry-run
```

The Astro site should read `<outputDir>/by-file/` for a whole local suite; use one
raw-run JSON only for an intentional execution snapshot. Configure persona `views`, journeys,
states, multi-source drift, and journey history in
`story-docs/executable-stories.config.mjs`; do not generate per-story Markdown
with the removed `build-docs` command. For a cross-repository hub, publish each
product's run with the GitHub Action's `mode: publish-run`, fetch the stable
URLs, then run the hub's normal Astro build.

### Programmatic usage

```typescript
import {
  canonicalizeRun,
  ReportGenerator,
} from 'executable-stories-formatters';

const rawRun = JSON.parse(await readFile('raw-run.json', 'utf-8'));
const canonical = canonicalizeRun(rawRun);

const generator = new ReportGenerator({
  formats: ['markdown', 'html'],
  outputDir: 'docs',
  outputName: 'user-stories',
  outputNameTimestamp: true, // optional: unique filenames per run (e.g. user-stories-1739123456.md)
  sortTestCases: 'id', // optional: stable order for diff-friendly reports
});

const outputs = await generator.generate(canonical);
// Map<OutputFormat, string[]> — file paths written per format
```

`generate(canonical)` updates canonical per-source state before rendering. When the
input is already assembled—such as `aggregateReports({ dir: "reports/by-file" })`—use
`generate(canonical, { persist: false })` so rendering does not write or restamp state.

### What `format` prints and writes

- **Summary line (stderr).** After a successful `format`, one line reports the
  outcome so an empty or all-failing run never looks like a healthy one, e.g.
  `✖ 12 scenarios (11 passed, 1 failed) → reports/index.html in 84ms`. The icon
  is `✔` only when nothing failed, `✖` otherwise. It goes to stderr (piped
  stdout — the file list — stays clean) and is skipped under `--json-summary`.
  A mixed documentation + execution request prints separate `Documentation` and
  `Execution` lines. `--json-summary` mirrors them as `documented` and `executed`
  groups, each with `files`, `counts`, and optional `unasserted`; the top level also
  includes `ranCount`. `unasserted` is absent when assertion observation is unknown.
- **Colocated index.** With colocated output (one report per source file), the
  generator also writes `index.html` in the output dir linking every per-file
  report, failures first — the front door a bare tree of reports otherwise
  lacks. It is skipped (with a warning) when a report already occupies
  `index.html` (e.g. an aggregated report named `index` in mixed mode).
  Aggregated output needs no index — the single file already is the entry point.

Full CLI flag list, per-formatter programmatic API, asset bundling, Atlassian publishing, validation helpers, before/after diffs, and notifications: [REFERENCE.md](REFERENCE.md).

## Core Patterns

### Three-layer pipeline

```
Test code (story.given/when/then)
  → Framework adapter (vitest/jest/playwright/cypress)
    → RawRun JSON (schemaVersion: 1)
      → canonicalizeRun() → TestRunResult
        → Formatters (Astro, Confluence, HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages,
          release-manifest, traceability-matrix, traceability-csv, story-report-json, scenario-index-json, behavior-manifest-json, agent-text)
        → Agent-loop commands (check, triage, goal) read the same TestRunResult
```

## Agent loop commands

Three subcommands turn a run into signals a coding agent (or an unattended loop) can act on. They accept either one RawRun/canonical JSON file or a directory of persistent per-file reports. Pass the current raw run for immediate backpressure, or pass `reports/by-file/` when the decision needs the accumulated catalog. They never switch scopes implicitly.

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
executable-stories list reports/by-file --list-format json   # text (default) | json | csv | markdown-table
executable-stories list raw-run.json --list-format json      # this execution only
# supports --include-tags / --exclude-tags, --input-type, --stdin
```

The discovery index for agents and explorers — one scenario per line (text) or machine-parsable JSON. Use it for triage before reading source tests. Point it at `by-file/` for the accumulated suite; a single run file lists only what that run executed.

### watch — keep agent artifacts fresh

```bash
executable-stories watch raw-run.json --format story-report-json,scenario-index-json --output-dir reports
```

Regenerates the chosen reports whenever the raw-run file changes — keeps the live agent index (StoryReport JSON + scenario index) up to date during a coding loop without re-invoking `format` by hand.

Live-reloading docs during a loop (`init-astro` + `astro dev`, the `Trajectory` component) and the remaining subcommands (`compare`, `gate-release`, `review`, `deploy`): [REFERENCE.md](REFERENCE.md).

## Each test file owns a report

`format <run.json>` writes one canonical report per source file into `<outputDir>/by-file/`,
named after the file, then renders. Running one test file rewrites one report; nothing
merges across files.

Point `format` at that directory to build a combined view from every test file:

```bash
executable-stories format reports/by-file --format html --output-dir reports
```

That is a pure read of the directory, so the same reports always render the same document.
The summary names how much of it the run in hand produced:

```
✔ 27 scenarios (27 passed) → reports/index.md in 120ms
  1 from this run, 26 carried over from earlier runs
```

`runs status` lists the reports with ages; `runs reset` deletes them.

A run reports `runScope`. `"full"` means the adapter determined no name filter applied, so
it replaces the file's report and retires anything missing, naming it in a warning.
`"filtered"` updates only the scenarios it names. Absent means the adapter could not tell,
which keeps the rest and warns — stale beats missing.

JUnit, Cucumber, and `release-manifest` always render the execution in hand. Other
formats render the accumulated suite. This keeps CI and tested-together evidence honest
without making a focused docs run erase unrelated stories.

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

The CLI validates against the RawRun schema (`additionalProperties: false`, so unknown keys are rejected — including a field an adapter has learned to emit but the schema does not yet declare). Invalid input exits with code 1. Required at the top level: `schemaVersion`, `testCases`, and `projectRoot`. On each test case only `status` is required; the human-readable name field is `title` (not `name`). Valid `status` values: `pass`, `fail`, `skip`, `todo`, `pending`, `timeout`, `interrupted`, `unknown`. For arbitrary runner data use the optional `meta` object — there is no top-level `metadata` field.

Source: packages/executable-stories-formatters/src/cli.ts

### MEDIUM Tests without story metadata silently filtered

```typescript
// This test has no story.init() — it will be excluded from reports
it('adds numbers', () => {
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
