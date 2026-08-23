---
title: Formatters API
description: Programmatic report generation with executable-stories-formatters
---

The **`executable-stories-formatters`** package provides a programmatic API to turn test results into reports. It supports **Cucumber JSON**, **HTML**, **JUnit XML**, **Markdown**, **Astro/Starlight**, and **Confluence (ADF)**. Framework reporters (Vitest, Jest, Playwright) use this package under the hood; you can also use it directly in custom scripts or CI pipelines.

## Installation

Add the formatters package as a dependency (it is typically used alongside a framework package):

```bash
pnpm add -D executable-stories-formatters
```

If you only need adapters in a separate build, you can use the **`/adapters`** subpath:

```ts
import { adaptJestRun, adaptVitestRun, adaptPlaywrightRun } from "executable-stories-formatters/adapters";
```

## Architecture

Three layers:

1. **Adapters** — Convert framework-specific results to a raw run (`RawRun`).
2. **Anti-Corruption Layer (ACL)** — Normalize to a canonical `TestRunResult` via `canonicalizeRun`.
3. **Formatters** — Turn `TestRunResult` into Cucumber JSON, HTML, JUnit, Markdown, Astro, or Confluence (ADF).

The **ReportGenerator** class combines adapters + ACL + formatters: you feed it a canonical `TestRunResult` and options, and it writes files.

## Quick start

Normalize framework results, then generate reports:

```ts
import {
  normalizeVitestResults,
  ReportGenerator,
} from "executable-stories-formatters";

// After a Vitest run, you have testModules (from the reporter or custom harvest).
const run = normalizeVitestResults(testModules);

const generator = new ReportGenerator({
  formats: ["markdown", "cucumber-json"],
  outputDir: "reports",
  output: { mode: "aggregated" },
});

const written = await generator.generate(run);
// written.get("markdown") → ["reports/index.md"]
// written.get("cucumber-json") → ["reports/index.cucumber.json"]
```

Same idea for Jest or Playwright: use **`normalizeJestResults`** or **`normalizePlaywrightResults`** with the appropriate result shape, then **`ReportGenerator`**.

## Adapters

Adapters turn framework output into **`RawRun`** (input to the ACL).

| Adapter | Input | Usage |
| ------- | ----- | ----- |
| `adaptJestRun` | Jest aggregated result + story reports | `adaptJestRun(jestResults, storyReports, adapterOptions?)` |
| `adaptVitestRun` | Vitest test modules | `adaptVitestRun(testModules, adapterOptions?)` |
| `adaptPlaywrightRun` | Playwright test results | `adaptPlaywrightRun(testResults, adapterOptions?)` |

Adapter options are framework-specific (e.g. `projectRoot`, `startedAtMs`). See the package types for `JestAdapterOptions`, `VitestAdapterOptions`, `PlaywrightAdapterOptions`.

## Normalizers

Convenience functions that run **adapter + canonicalizeRun** in one step:

- **`normalizeJestResults(jestResults, storyReports, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`
- **`normalizeVitestResults(testModules, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`
- **`normalizePlaywrightResults(testResults, adapterOptions?, canonicalizeOptions?)`** → `TestRunResult`

Use these when you have framework results and want a canonical run for **ReportGenerator** or individual formatters.

## ReportGenerator

**ReportGenerator** accepts only a canonical **`TestRunResult`** (create it with normalizers or `canonicalizeRun(rawRun, options)`).

### Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `formats` | `OutputFormat[]` | `["cucumber-json"]` | Output formats: `"cucumber-json"`, `"cucumber-html"`, `"cucumber-messages"`, `"html"`, `"junit"`, `"markdown"`, `"release-manifest"`, `"traceability-matrix"`, `"astro-markdown"`, `"confluence"`, `"story-report-json"`, `"scenario-index-json"`, `"behavior-manifest-json"`, `"agent-text"`. |
| `outputDir` | `string` | `"reports"` | Base directory for output files. |
| `outputName` | `string` | `"index"` | Base filename (without extension) for aggregated output. |
| `output` | `OutputConfig` | see below | Output routing (mode, colocated style, rules). |
| `cucumberJson` | `{ pretty?: boolean }` | `{ pretty: false }` | Cucumber JSON options. |
| `html` | `HtmlOptions` | — | Title, darkMode, searchable, startCollapsed, embedScreenshots. |
| `junit` | `JUnitOptions` | — | suiteName, includeOutput. |
| `markdown` | `MarkdownFormatterOptions` | — | title, includeStatusIcons, includeMetadata, includeErrors, scenarioHeadingLevel, stepStyle, groupBy, sortScenarios, includeFrontMatter, includeSummaryTable, permalinkBaseUrl, ticketUrlTemplate, includeSourceLinks, customRenderers. |
| `confluence` | `ConfluenceFormatterOptions` | — | title, includeStatusIcons, includeMetadata, includeSummaryTable, includeErrors, scenarioHeadingLevel, groupBy, sortScenarios, pretty, permalinkBaseUrl, ticketUrlTemplate. |
| `scenarioIndexJson` | `{ pretty?: boolean }` | `{ pretty: true }` | Scenario index (`scenario-index` v1) JSON options. |
| `behaviorManifestJson` | `{ pretty?: boolean }` | `{ pretty: true }` | Behavior manifest JSON options. |

**OutputConfig:**

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `mode` | `"aggregated"` \| `"colocated"` | `"aggregated"` | Single file vs one file per source. |
| `colocatedStyle` | `"mirrored"` \| `"adjacent"` | `"mirrored"` | Colocated: mirrored under `outputDir` or next to source file. |
| `rules` | `OutputRule[]` | `[]` | Pattern-based overrides (first match wins). |
| `outputName` | `string` | — | Override base filename for rules. |

**OutputRule:** `match` (glob), `mode`, `colocatedStyle`, `outputDir`, `outputName`, `formats`.

### Output routing

- **Aggregated** — All test cases in one file per format under `outputDir` (e.g. `reports/index.md`).
- **Colocated mirrored** — One file per source file, directory structure mirrored under `outputDir`.
- **Colocated adjacent** — One file per source file, written next to the test file (ignores `outputDir` for that rule).

Rules allow different routing per path (e.g. `src/**` colocated, `e2e/**` aggregated).

For **colocated HTML** output, the generator also writes an `index.html` in `outputDir` linking every per-file report, failures first — the entry point a bare tree of colocated reports otherwise lacks. It is skipped (with a warning) when a report already occupies `index.html` (for example an aggregated report named `index` in mixed aggregated + colocated output). Aggregated output needs no index page: the single file already is the entry point.

### Generate

```ts
const generator = new ReportGenerator(options);
const result: Map<OutputFormat, string[]> = await generator.generate(run);
```

**result** maps each requested format to the list of written file paths.

## Individual formatters

You can use formatters without **ReportGenerator** if you already have a **`TestRunResult`**:

- **CucumberJsonFormatter** — `formatToString(run)` → string
- **JUnitFormatter** — `format(run)` → string
- **MarkdownFormatter** — `format(run)` → string
- **AstroFormatter** — `format(run)` → string (themed Markdown with Starlight frontmatter)
- **ConfluenceFormatter** — `format(run)` → string (ADF JSON); also `formatToAdf(run)` → the `{ version, type: "doc", content }` object

The HTML report renders via **`executable-stories-react`**: `renderReportToHtml(toStoryReport(run))` from `executable-stories-react/ssr`.

The scenario → Markdown serializer, **`scenarioToMarkdown`**, lives in the internal `executable-stories-core` package (not in formatters). It is the single implementation behind both the HTML report's per-scenario "Copy as Markdown" button (`variant: "compact"` — a paste-sized excerpt) and the Astro site's `<slug>.md` twin endpoints (the default full variant — a standalone document), so the two surfaces cannot drift. See [Core types & constants](/reference/core-api/).

Instantiate with the same options as in **ReportGenerator** (e.g. `MarkdownFormatterOptions` for Markdown, `ConfluenceFormatterOptions` for Confluence).

## ACL and validation

- **`canonicalizeRun(rawRun, options?)`** — Normalize `RawRun` to `TestRunResult`. Options: `attachments`, `cucumber`, `defaults`.
- **`validateCanonicalRun(run)`** — Returns validation result; **`assertValidRun(run)`** throws if invalid.

Utilities: **`normalizeStatus`**, **`generateTestCaseId`**, **`generateRunId`**, **`slugify`**, **`deriveStepResults`**, **`mergeStepResults`**, **`resolveAttachment`**, **`resolveAttachments`**.

## Types

Key types exported:

- **Canonical:** `TestRunResult`, `TestCaseResult`, `TestCaseAttempt`, `StepResult`, `Attachment`, `TestStatus`, `CIInfo`, `CoverageSummary`
- **Raw:** `RawRun`, `RawStatus`, `RawAttachment`, `RawStepEvent`, `RawTestCase`, `RawCIInfo`
- **Cucumber JSON:** `IJsonFeature`, `IJsonScenario`, `IJsonStep`, `IJsonStepResult`, etc.
- **Options:** `FormatterOptions`, `ResolvedFormatterOptions`, `OutputFormat`, `OutputMode`, `ColocatedStyle`, `OutputRule`, `CanonicalizeOptions`, `MarkdownFormatterOptions`, `MarkdownRenderers`

## When to use

- **Framework reporters** — Vitest/Jest/Playwright reporters use this package to produce Markdown (and optionally other formats). You configure them in the framework config; no need to call the formatters API directly.
- **Custom scripts** — Harvest test results (e.g. from a framework API or JSON output), then call **normalize\*Results** and **ReportGenerator** to produce HTML, JUnit, or Cucumber JSON in addition to (or instead of) the built-in reporter.
- **CI / tooling** — Generate multiple formats from one run, or merge runs from multiple projects and then format once.

For reporter options (title, output path, front-matter, etc.) when using the framework reporter, see [Vitest reporter options](./vitest-config/), [Jest reporter options](./jest-config/), and [Playwright reporter options](./playwright-config/).

## CLI

The formatters package provides an **`executable-stories`** CLI for generating reports from JSON test results.

**Subcommands:**

- **`executable-stories format [file]`** — Read raw (or canonical) test results and generate reports. **The input `[file]` is optional**: when omitted (and not using `--stdin`), the CLI resolves `.executable-stories/raw-run.json`, then `reports/raw-run.json`, and announces the path it chose on stderr. The first is where the non-JS adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) write; the second is where a JS reporter writes when `rawRunPath` is set. Use `--format` to choose one or more of: `html`, `cucumber-html`, `markdown`, `release-manifest`, `traceability-matrix`, `junit`, `cucumber-json`, `cucumber-messages`, `astro-markdown`, `confluence`, `story-report-json`, `scenario-index-json`, `behavior-manifest-json`, `agent-text` (the full run as flat token-lean plain text for pasting into an LLM). Default format is `html`. `--preset agent|ci|docs` expands to a format bundle (and unions with `--format` when both are given). The `story-report-json` format emits the [StoryReport v1 contract](/reference/react-renderer#the-storyreport-contract) consumed by `executable-stories-react`; `scenario-index-json` and `behavior-manifest-json` emit the agent artifacts described in the [Agent artifact contract](/guides/agent-artifact-contract/); `release-manifest` emits the signed-off scenario manifest used by the [Release confidence](/guides/release-confidence/) workflow; `traceability-matrix` emits a requirement-first matrix (ticket → scenarios → covered code → status), described in [Agent loops and backpressure](/guides/agent-loops/). On success `format` prints a one-line summary to stderr (e.g. `✖ 12 scenarios (11 passed, 1 failed) → reports/index.html in 84ms`); add `--open` to reveal the generated HTML report in the default browser.
- **`executable-stories doctor [file]`** — Diagnose the run JSON without generating anything: where it is (the same default locations `format` resolves), whether it parses, its `schemaVersion` versus what this CLI supports, whether it carries test cases, and whether it has a `$schema` pointer. Because adapters ship independently of the CLI across six languages, it names the "adapter newer than CLI" drift case explicitly (a `schemaVersion` higher than the CLI supports) instead of letting it surface as a confusing validation error deep in `format`. Add `--json` for machine output. Exit `0` when healthy, `4` otherwise.
- **`executable-stories completion <bash|zsh|fish>`** — Print a shell completion script to stdout (subcommands, common flags, and closed-set flag values). Redirect or `eval` it, e.g. `executable-stories completion zsh > ~/.zsh/completions/_executable-stories`.
- **`executable-stories watch <file>`** — Watch the raw-run file and regenerate the chosen `--format` artifacts on every change (live agent index). Pairs with the framework's own watch mode; long-lived until interrupted.
- **`executable-stories compare <current>`** — Compare two runs and generate a diff report.
- **`executable-stories gate-release <dev-run.json> <rc-run.json>`** — Verify a release candidate against the dev test baseline (RC gate). See [Release confidence](/guides/release-confidence/).
- **`executable-stories review <file> --changed-files <path>`** — Generate an Evidence Review of AI-authored changes, correlating a run to the diff. Add `--patch <file>` (from `git diff --histogram`) plus `--code-diff <sidecar.json>` to embed annotated Code Diff evidence: content-anchored annotations with scenario deep links, rendered after the behavioural explanation. `--strict-code-diff` fails the gate on orphaned anchors or unverified scenario references.
- **`executable-stories list <file>`** — List scenarios from a test run.
- **`executable-stories check <file>`** — Backpressure summary for coding agents: passing scenarios collapse to a count, each failing scenario expands to its Given/When/Then, failing step, error, and the code it `covers`. Exits non-zero on failures. Scenarios that are switched off are named rather than counted — each skipped scenario is listed with its location and its ticket, or `no ticket`, and a run with any of them reads `All running scenarios green.` instead of green, because a count in a headline is how a turned-off spec gets forgotten. Planned (`it.todo`) scenarios are a spec waiting for code, not a spec you stopped validating, so they stay out of that list. `--max-skipped <n>` puts a budget on that list and exits 5 when it is exceeded, so switching a spec off stays a decision someone makes rather than a habit that accumulates. See [Agent loops and backpressure](/guides/agent-loops/).
- **`executable-stories goal <file>`** — Behavioral definition-of-done for agent loops: met when the required scenarios/tags/tickets pass, nothing regressed, and no scenario was removed or weakened versus a baseline. Exit 0 = met, 5 = not yet.
- **`executable-stories triage <file>`** — Discovery worklist for agent loops: failing scenarios, regressions first, each with the code it `covers`, the error, and its tickets.
- **`executable-stories validate <file>`** — Validate a JSON file against the schema (no output generated).
- **`executable-stories init-astro [directory]`** — Scaffold an Astro/Starlight docs site for story output.
- **`executable-stories new <template> "<name>"`** — Scaffold a docs page from a template (`adr`, `runbook`, `decision-log`, `incident`).
- **`executable-stories check-links <dir>`** — Scan docs for broken internal/external links (CI-friendly exit code).
- **`executable-stories push <run.json|results.xml|allure-results/>`** — Send a run to a cloud ingest endpoint without a custom curl script. It takes a StoryReport v1, a raw run JSON, or the output of any other framework: JUnit XML, Playwright's JSON reporter, or an allure-results directory (its `*-result.json` files are collected into one array). The format is detected from what you point at rather than selected by subcommand, and `--format story|junit|playwright|allure` overrides when detection guesses wrong; a declared `schemaVersion` always wins, so a StoryReport is never mistaken for something else. Foreign formats are uploaded verbatim and converted server-side, so the conversion rules live in one place instead of drifting between the server and every version of this CLI in the wild, and nothing in your tests needs a marker or an annotation. `--force` stops a failed push from failing the build (network, auth, a rejected file), because a CI job that goes red when the reporting endpoint blinks teaches people to stop reporting; it covers the wire, never the verdict, so `--gate` still exits 5 on a blocked release. Key via `--key` or `EXECUTABLE_STORIES_API_KEY`; repo/branch/SHA inferred from git, overridable with `--repo`, `--branch`, `--git-sha`. `--base <ref>` attaches the files changed since `<ref>` for change-aware selection, and the response's run URL and recommended scope are printed. `--gate` asks the endpoint whether the pushed commit is safe to release and exits 5 if it is blocked, naming every blocking reason; a commit with no release recorded against it exits 0, and an unreachable or erroring gate fails rather than passes. Under GitHub Actions it needs no flags: repo/branch/SHA come from the environment, the base commit and PR number from the event payload, the run URL and recommended scope go to the job summary, and the run id is appended to `GITHUB_OUTPUT` as `ingest-run-id`. A pushed run is an event, not a snapshot of the whole suite: a run from a filtered test command carries only the files it ran, and `report.features[].sourceFile` is the set of files it can speak for. Consumers should merge a run into known state per scenario and treat a scenario as gone only when its source file was in that set (or appears deleted in `changedFiles`), otherwise a one-file run reads as a mass deletion.
- **`executable-stories import-openapi <spec>`** — Generate API doc pages from an OpenAPI spec, linked to verifying stories.
- **`executable-stories publish-confluence <file.adf.json>`** — Push an ADF file to a Confluence page. See the [Publishing to Confluence & Jira](/guides/publishing-to-atlassian/) guide.
- **`executable-stories publish-jira <file.adf.json>`** — Push an ADF file to a Jira issue as a comment or description.
- **`executable-stories deploy <record|status|diff>`** — Record deployments, show per-environment status, and detect scenario drift between environments.
- **`traceability-matrix` / `traceability-csv`** — Requirement-first Markdown
  and its flat spreadsheet projection. CSV includes `evidence_grade` using the
  Evidence Review `none` / `weak` / `moderate` / `strong` rubric and emits
  untraced scenarios explicitly.
- **`executable-stories compare <baseline> <current> --format html`** — The HTML
  diff adds a step-screenshot storyboard to regressed and fixed scenarios when
  the current run contains browser-renderable frames.
- **`--partial`** (`compare`, `gate-release`) — The current run covers only some
  test files, as a filtered local run or a CI shard does. Baseline scenarios in
  files the run never touched are counted as **not run** and left out of the
  diff instead of being reported as removed, so `--fail-on-removal` does not
  fail a shard for tests it was never asked to run. Off by default: a file
  missing because it was deleted looks identical to one missing because it was
  not selected, and guessing wrong would hide a real deletion from the gate.

**Filtering by source file:**

- **`--include <globs>`** — Comma-separated globs; only test cases whose `sourceFile` matches at least one pattern are included.
- **`--exclude <globs>`** — Comma-separated globs; test cases whose `sourceFile` matches any pattern are excluded (applied after include).

**HTML report options (all enabled by default):**

- Step text in the HTML report highlights **quoted strings** and **standalone numbers** (step parameter highlighting) for readability.
- **View state is in the URL.** Search, status filter, tags, and the documentation toggle are written to the URL fragment (`#?q=login&tags=smoke`), so a refresh keeps the view and a filtered report can be shared as a link. A scenario deep link keeps working and coexists with filters: `#<scenario-id>?q=login`. The fragment is used rather than the query string because a report opened from disk (`file://`) has an opaque origin, where browsers refuse History API URL changes.
- **Mermaid diagrams are validated before rendering** with mermaid's own `parse()`. A diagram with a syntax error shows the error message above its source instead of quietly falling back to a code block. A blocked or offline CDN still falls back silently.
- **`--html-no-syntax-highlighting`** — Disable syntax highlighting in HTML.
- **`--html-no-mermaid`** — Disable Mermaid diagram rendering in HTML.
- **`--html-stale-after-days <n>`** — Days before the interactive HTML report shows a "Last verified N days ago" stale warning (default: 7; `0` disables). Fresh reports show a quiet "Verified N ago" line instead.

**CI detection:** When the CLI runs in a CI environment, it auto-detects the provider (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) from environment variables and attaches branch, commit SHA, PR number, and build URL to the run. The HTML report shows this in a **CI** meta block. No flags required.

**Notifications:** After generating reports, the CLI can send a summary to Slack, Microsoft Teams, or a generic webhook. Use **`--slack-webhook`** or **`--teams-webhook`** (or `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL` env), or **`--webhook-url`** (repeatable) for a generic HTTP endpoint. **`--notify`** controls when: `always`, `on-failure` (default), or `never`. **`--report-url`** supplies a link to the report in notification messages. Optional HMAC signing: **`--webhook-hmac-secret`**, **`--webhook-hmac-header`**, **`--webhook-hmac-timestamp`**.

**Run history:** Use **`--history-file <path>`** to persist run history to a JSON file. The CLI updates it before generating reports (so the current run is the latest entry) and uses it to show **flakiness**, **stability grade** (A–F), and **performance trend**. The interactive HTML report also renders a **per-scenario run timeline**: a dot per recent run on each scenario card, with a tooltip summary like "8/10 runs passed · Passing for the last 5 runs". Scenarios whose recent runs flip between pass and fail get a **Flaky badge** next to the timeline, and the report header shows a **"Since last run" strip** summarizing newly failing, fixed, and first-seen scenarios (with deep links) compared to the previous run in the history. **`--max-history-runs <n>`** (default 10) caps how many runs are kept per test. Omit `--history-file` to disable history.

**Standalone binary:** From the formatters package directory, run `bun run compile` to build a single `executable-stories` binary. CI builds produce platform-specific binaries (e.g. `executable-stories-linux-x64`); the release workflow uploads multi-platform binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64) as the `formatters-binaries` artifact.

### `format` flags reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format` | string | `html` | Output format(s): `html`, `cucumber-html`, `markdown`, `release-manifest`, `traceability-matrix`, `junit`, `cucumber-json`, `cucumber-messages`, `astro-markdown`, `confluence`, `story-report-json`, `scenario-index-json`, `behavior-manifest-json`, `agent-text` |
| `--preset` | string | — | Format bundle: `agent` (`story-report-json`, `scenario-index-json`, `behavior-manifest-json`, `agent-text`), `ci` (`junit`, `story-report-json`), or `docs` (`html`, `markdown`). Unions with `--format` when both are given |
| `--open` | boolean | `false` | Open the generated HTML report in the default browser after writing |
| `--output-dir` | string | `reports` | Directory to write output files |
| `--output-name` | string | `index` | Base filename (without extension) for aggregated output |
| `--input-type` | string | `raw` | Input type: `raw`, `canonical`, or `ndjson` |
| `--sort-test-cases` | string | `none` | Sort scenarios: `id`, `source`, or `none` |
| `--include-tags` | string | — | Comma-separated tags to include (any match) |
| `--exclude-tags` | string | — | Comma-separated tags to exclude (any match) |
| `--include` | string | — | Glob patterns to include by source file |
| `--exclude` | string | — | Glob patterns to exclude by source file |
| `--synthesize-stories` | boolean | `true` | Synthesize story metadata for plain tests |
| `--no-synthesize-stories` | boolean | — | Disable story synthesis (strict mode) |
| `--html-no-syntax-highlighting` | boolean | `false` | Disable syntax highlighting in HTML |
| `--html-no-mermaid` | boolean | `false` | Disable Mermaid diagram rendering in HTML |
| `--html-stale-after-days` | number | `7` | Days before the HTML report warns it is stale (`0` disables) |
| `--asset-mode` | string | `none` | Asset bundling: `none` or `copy` |
| `--allow-missing-assets` | boolean | `false` | Warn instead of fail on missing assets |
| `--output-name-timestamp` | boolean | `false` | Append UTC timestamp to output filename |
| `--emit-canonical` | string | — | Write canonical JSON to given path |
| `--json-summary` | boolean | `false` | Print machine-parsable JSON summary |
| `--history-file` | string | — | Path to run history JSON file |
| `--max-history-runs` | number | `10` | Maximum runs to keep per test in history |
| `--slack-webhook` | string | — | Slack webhook URL for notifications |
| `--teams-webhook` | string | — | Microsoft Teams webhook URL for notifications |
| `--webhook-url` | string | — | Generic webhook URL (repeatable) |
| `--notify` | string | `on-failure` | When to send notifications: `always`, `on-failure`, or `never` |
| `--report-url` | string | — | Link to the report included in notification messages |
| `--webhook-hmac-secret` | string | — | HMAC secret for webhook signing |
| `--webhook-hmac-header` | string | — | Header name for HMAC signature |
| `--webhook-hmac-timestamp` | boolean | `false` | Include timestamp in HMAC signing |

### `compare`

Compare two test runs and generate a diff report showing regressions, fixes, and changes.

```bash
executable-stories compare current.json --baseline baseline.json --format html
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--baseline` | string | — | Baseline JSON file, or `auto` to pick the most recent prior run |
| `--baseline-dir` | string | — | Directory to scan when using `--baseline auto` |
| `--pr-summary` | boolean | `false` | Print PR-friendly markdown summary to stdout |
| `--pr-summary-file` | string | — | Write the PR summary to a file |

Inherits all `format` flags. Diff reports support the `html`, `markdown`, and `changelog` formats.

**Behavior changelog:** `--format changelog` writes a release-notes-style Markdown changelog (`<output-name>.changelog.md`) between the two runs, written for the reader of a release rather than the reviewer of a diff. Sections in reader order: **New behavior** (each new scenario listed with its Given/When/Then steps, so the entry reads as a specification), **Fixed**, **Broken**, **Removed**, **Renamed or moved** (rename/move-resilient identity, so refactors don't show up as removed + added), and **Changed**. The header carries each run's `packageVersion`, short commit SHA, and date — tag your runs with a version to get `1.2.0 → 1.3.0` release headers:

```bash
executable-stories compare v1.2.0-run.json v1.3.0-run.json --format changelog --output-name release-1.3.0
```

**Auto-baseline:**

```bash
executable-stories compare current.json \
  --baseline auto \
  --baseline-dir .executable-stories/history/ \
  --format html
```

**PR summary for CI:**

```bash
executable-stories compare current.json \
  --baseline baseline.json \
  --pr-summary-file pr-comment.md
```

### `list`

List all scenarios from a test run.

```bash
executable-stories list raw-run.json
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--include-tags` | string | — | Comma-separated tags to include |
| `--exclude-tags` | string | — | Comma-separated tags to exclude |
| `--json-summary` | boolean | `false` | Output as JSON instead of text table |
| `--input-type` | string | `raw` | Input type: `raw`, `canonical`, or `ndjson` |
| `--stdin` | boolean | `false` | Read from stdin |

### `check`

Backpressure summary for coding agents: passing scenarios collapse to one line, each failing scenario expands to its Given/When/Then, the failing step, the error, and the code it `covers`. Exits `5` when any scenario failed, so an agent loop reacts before a human. See [Agent loops and backpressure](/guides/agent-loops/).

```bash
executable-stories check .executable-stories/raw-run.json --baseline reports/previous.json
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--baseline` | string | — | Prior run (path or `auto`) to add "N regressed / N fixed" deltas |
| `--check-format` | string | `text` | `text` or `json` |
| `--no-fail` | boolean | `false` | Report only — always exit 0 even when scenarios failed |
| `--stdin` | boolean | `false` | Read from stdin |

### `goal`

Behavioral definition-of-done for an agent loop (the `/goal` stopping condition). Met when the required scenarios pass, nothing regressed (`--no-regressions`), and no scenario was removed, disabled, or had steps deleted versus `--baseline` (the ratchet, on by default with a baseline). Exit `0` = met, `5` = not yet, so a loop runs until the verdict flips.

```bash
executable-stories goal raw-run.json --require-tickets US-101 --baseline prev.json --no-regressions
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--require-tags` | string | — | Every scenario carrying any of these tags must pass |
| `--require-tickets` | string | — | Every scenario carrying any of these tickets must pass |
| `--require-scenarios` | string | — | These scenarios (by id or exact title) must pass |
| `--baseline` | string | — | Prior run (path or `auto`) for regression and ratchet checks |
| `--no-regressions` | boolean | `false` | Not met if any scenario regressed vs baseline |
| `--no-ratchet` | boolean | `false` | Disable the removed/weakened-scenario guard (on by default with `--baseline`) |
| `--goal-format` | string | `text` | `text` or `json` |
| `--stdin` | boolean | `false` | Read from stdin |

### `triage`

Discovery-phase worklist for an agent loop: failing scenarios, regressions first, each with the product code it `covers`, the error, and its tickets. Failures with no `covers` are flagged. Always exits `0` — it reports work, it does not gate.

```bash
executable-stories triage raw-run.json --baseline reports/last-green.json --triage-format json
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--baseline` | string | — | Prior run (path or `auto`) to flag and rank regressions first |
| `--triage-format` | string | `text` | `text` or `json` |
| `--stdin` | boolean | `false` | Read from stdin |

### `publish-confluence`

Publish an ADF JSON file (generated via `--format confluence`) to a Confluence Cloud page. See the [Publishing to Confluence & Jira](/guides/publishing-to-atlassian/) guide for a full walkthrough.

```bash
executable-stories publish-confluence reports/index.adf.json \
  --page-id 123456 \
  --base-url https://acme.atlassian.net/wiki
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--page-id` | string | — | Update an existing page (alternative to `--space-id`) |
| `--space-id` | string | — | Create a new page in this space (requires `--title`) |
| `--parent-id` | string | — | Parent page ID (for new pages) |
| `--title` | string | — | Page title (required for create; overrides current title on update) |
| `--base-url` | string | — | Confluence base URL, e.g. `https://acme.atlassian.net/wiki` (env: `CONFLUENCE_BASE_URL`) |
| `--email` | string | — | Atlassian account email (env: `CONFLUENCE_EMAIL`) |
| `--token` | string | — | API token (env: `CONFLUENCE_TOKEN`) |
| `--dry-run` | boolean | `false` | Validate inputs and print request plan, don't POST |

### `publish-jira`

Publish an ADF JSON file to a Jira Cloud issue as a comment (default, non-destructive) or replace the issue description.

```bash
executable-stories publish-jira reports/index.adf.json \
  --issue PROJ-123 \
  --base-url https://acme.atlassian.net
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--issue` | string | — | Issue key, e.g. `PROJ-123` (required) |
| `--mode` | string | `comment` | `comment` (appends) or `description` (replaces) |
| `--base-url` | string | — | Jira base URL, e.g. `https://acme.atlassian.net` (env: `JIRA_BASE_URL`) |
| `--email` | string | — | Atlassian account email (env: `JIRA_EMAIL`) |
| `--token` | string | — | API token (env: `JIRA_TOKEN`) |
| `--dry-run` | boolean | `false` | Validate inputs and print request plan, don't POST |

Both publishers are also available as library functions: **`publishConfluencePage(args, deps)`** and **`publishJiraIssue(args, deps)`**. The `deps` object accepts an injected `fetch` for testing.
