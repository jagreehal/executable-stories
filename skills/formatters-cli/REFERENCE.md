Disclosed reference for [`formatters-cli`](SKILL.md) — full flag list, per-formatter API, and advanced subcommand usage. The setup, agent-loop commands, and common mistakes that nearly every task needs stay in `SKILL.md`; this file covers everything reached only for a specific advanced task.

## Individual formatters (programmatic)

```typescript
import {
  canonicalizeRun,
  AstroFormatter,
  ConfluenceFormatter,
  MarkdownFormatter,
  JUnitFormatter,
  CucumberJsonFormatter,
} from "executable-stories-formatters";

const canonical = canonicalizeRun(rawRun);

const md = new MarkdownFormatter().format(canonical);
const junit = new JUnitFormatter().format(canonical);
const cucumberJson = new CucumberJsonFormatter().formatToString(canonical);
const astro = new AstroFormatter().format(canonical);
const confluenceAdfJson = new ConfluenceFormatter().format(canonical);
// No standalone HtmlFormatter class — the in-package HTML string renderer was
// removed. `html` renders via executable-stories-react/ssr's renderReportToHtml,
// used internally by ReportGenerator({ formats: ["html"] }).
```

### Markdown formatter options

The Markdown report has authoring options the CLI does not expose; reach them
through `ReportGenerator({ markdown: {...} })` or `new MarkdownFormatter({...})`.
Pick them to match where the Markdown lands.

| Option                 | Values                              | Default         | Use it for                                                                 |
| ---------------------- | ----------------------------------- | --------------- | -------------------------------------------------------------------------- |
| `stepStyle`            | `"bullets"` \| `"gherkin"`          | `"bullets"`     | `gherkin` prints steps as an indented Given/When/Then block, for readers who know Cucumber. |
| `groupBy`              | `"file"` \| `"suite"` \| `"none"`   | `"file"`        | `suite` groups by `describe` path; `none` is one flat list, right for a single-feature PR comment. |
| `scenarioHeadingLevel` | `2` \| `3` \| `4`                   | `3`             | Fit the report under an existing document's heading hierarchy.            |
| `sortScenarios`        | `"source"` \| `"alpha"` \| `"none"` | `"source"`      | `alpha` gives a stable diff-friendly order across runs.                    |
| `includeFrontMatter`   | boolean                             | `false`         | YAML front-matter (title, counts, timestamps) for static-site generators and machine parsing. |
| `includeSummaryTable`  | boolean                             | `false`         | A counts/duration table under the title, for a standalone page.            |
| `includeMetadata`      | boolean                             | `true`          | Turn off for a PR comment, where the run date is noise.                    |
| `includeStatusIcons`   | boolean                             | `true`          | ✅/❌ on scenario headings.                                                 |
| `includeErrors`        | boolean                             | `true`          | Failure messages under failed scenarios.                                   |
| `title`                | string                              | `"User Stories"`| Document title.                                                            |
| `suiteSeparator`       | string                              | `" - "`         | Joins nested `describe` titles in headings.                                |
| `attachImages`         | boolean                             | `false`         | Keep local screenshot/video paths for `gh pr comment --attach`. CLI: `--attach-images`. |
| `customRenderers`      | `MarkdownRenderers`                 | unset           | Override how a doc kind renders (`{ section: (e) => ... }`).               |

`permalinkBaseUrl`, `ticketUrlTemplate` and `traceUrlTemplate` are also accepted here and win over the top-level ones.

```typescript
// A PR comment: flat, gherkin steps, no run metadata.
const md = new MarkdownFormatter({
  groupBy: "none",
  stepStyle: "gherkin",
  includeMetadata: false,
  scenarioHeadingLevel: 4,
}).format(canonical);

// A docs page: front-matter and summary for the static-site build.
await new ReportGenerator({
  formats: ["markdown"],
  outputDir: "docs/stories",
  markdown: { includeFrontMatter: true, includeSummaryTable: true, sortScenarios: "alpha" },
}).generate(canonical);
```

## Pushing a run to the cloud

```bash
# Name the run, say where it ran, and attach an agent's write-up above the results.
executable-stories push reports/index.story-report.json \
  --title "CI ${GITHUB_RUN_NUMBER}" --env staging --description @analysis.md
```

`--title` names the run on the cloud (the repo slug stands in when absent). `--env` records
the environment (`staging`, `Browser:Chrome`), filterable there as `env == …`.
`--description` takes Markdown text, or `@path` to send a file's contents, shown above the
run's results. JUnit, Playwright JSON and allure inputs carry these in the request URL, so
a push whose encoded URL passes 8 KB is refused before sending; shorten the description or
convert to a StoryReport first (`format … --format story-report-json`). Sharded CI jobs
should aggregate `reports/by-file` with `format` and push once, so no shard reads as a mass
deletion of the scenarios it did not run.

## CLI flags

```bash
# Output control
--format html,markdown,junit,cucumber-json,cucumber-html,cucumber-messages,astro-markdown,confluence,release-manifest,traceability-matrix,traceability-csv,story-report-json,scenario-index-json,behavior-manifest-json,agent-text
--output-dir reports          # Base directory (default: reports)
--output-name index           # Base filename (default: index)
--output-name-timestamp       # Append run timestamp (UTC seconds) to filename for before/after diffs
--sort-test-cases id|source|none  # Deterministic scenario order (default: none). Use id for diff-friendly output
--input-type raw              # raw | canonical | ndjson
--config ./executable-stories.config.js  # Custom formats / config (default: auto-discovers executable-stories.config.mjs or .js in cwd; errors if both exist)

# Filtering
--include "test/api/**"       # Glob patterns to include (by sourceFile)
--exclude "test/fixtures/**"  # Glob patterns to exclude (by sourceFile)
--include-tags smoke,api      # Include test cases carrying any of these tags
--exclude-tags wip,flaky      # Exclude test cases carrying any of these tags

# HTML options
--html-title "Test Report"
--html-no-syntax-highlighting
--html-no-mermaid
--html-share                 # show the Share button (hidden by default)
--html-stale-after-days 7    # stale warning threshold in days; 0 disables

# Run history (interactive HTML: per-scenario timeline, Flaky badges,
# "Since last run" strip; plus stability grade + performance trend)
--history-file .executable-stories/history.json
--max-history-runs 10        # runs kept per test (default 10)

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

## Jev judgments (optional)

```bash
JEV_API_KEY=… executable-stories triage raw-run.json    # + suggested covers path and failure kind per unrouted failure
JEV_API_KEY=… executable-stories goal raw-run.json --baseline auto   # + advisories for rewritten scenarios that check less
JEV_API_KEY=… executable-stories review raw-run.json    # + inferred change-type on untagged claims
```

Answers carry their probability; exit codes stay rule-driven. `JEV_MODEL` / `JEV_ENDPOINT` override the defaults.

## Atlassian publishing

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
and the paths are rewritten. This covers `html`, `markdown` and `astro-markdown`, so a report
you commit keeps its media whatever format you generate.

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
- run: npx --package executable-stories-formatters executable-stories format .executable-stories/raw-run.json --format html --output-dir reports --asset-mode copy
- uses: actions/upload-artifact@v4
  with:
    name: test-report
    path: report/
```

### Options

| Flag | Description |
|------|-------------|
| `--asset-mode none` | Default. No asset bundling. |
| `--asset-mode copy` | Copy local assets to `assets/`, rewrite paths in `html`, `markdown` and `astro-markdown`. |
| `--allow-missing-assets` | Warn on missing assets instead of failing. |

## Validation

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

## Before/after diffs (evolution of tests)

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
- For `Regressed` and `Fixed` scenarios, the HTML report adds a horizontal
  storyboard when the current scenario has browser-renderable screenshots or
  `state` snapshots attached to steps. Local filesystem paths are omitted
  because they cannot be resolved by the browser; copied/relative assets,
  HTTP(S), and inline image data can render.
- Generates Markdown with per-scenario before/after summaries for PR discussion or artifact storage.
- Use canonical input when you already persist prior runs; raw and ndjson inputs are also supported as long as both files use the same `--input-type`.
- `--pr-summary` prints a compact PR-comment Markdown summary (priority signal + capped per-kind sections) to stdout; `--pr-summary-file <path>` writes it to a file.
- `--format changelog` writes a release-notes-style **behavior changelog** (`<output-name>.changelog.md`): New behavior (with Given/When/Then steps), Fixed, Broken, Removed, Renamed or moved (rename-resilient identity), Changed. Headers carry each run's `packageVersion` + short SHA + date — tag runs with versions for `1.2.0 → 1.3.0` release notes.
- Gates for CI: `--fail-on-regression`, `--fail-on-added-failures`, `--fail-on-removal`, `--fail-on-new`, `--max-regressions <n>` (exit code 5 when a gate fails).

## Requirement traceability exports

```bash
executable-stories format raw-run.json \
  --format traceability-matrix,traceability-csv \
  --output-dir reports
```

`traceability-matrix` is requirement-first Markdown. `traceability-csv` is its
flat spreadsheet projection: one row per requirement/scenario pair plus one row
per untraced scenario. The CSV includes `evidence_grade`, calculated with the
same `none` / `weak` / `moderate` / `strong` rules as Evidence Review. When
several scenario occurrences share a canonical ID, every matching row receives
the weakest observed grade so the audit export never overstates the proof.

## Notifications

```bash
executable-stories format raw-run.json \
  --format markdown \
  --slack-webhook "$SLACK_WEBHOOK_URL" \
  --notify on-failure \
  --report-url "https://ci.example.com/reports" \
  --max-failed-tests 5
```

## Other subcommands

`compare` (diff two runs), `gate-release` (verify an RC run against a dev baseline), `review` (Evidence Review of AI-authored changes vs the diff — writes `.md`, `.html`, and `.review.json`, the machine contract a CI surface renders ranked findings from), and `deploy record|status|diff` (deployment ledger + environment drift) round out the CLI — run `executable-stories --help` for the full list and `<subcommand> --help` per command.
