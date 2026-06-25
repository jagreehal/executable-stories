# executable-stories-mcp

MCP server for executable-stories behavior catalogs.

It consumes `story-report-json` output from `executable-stories-formatters` and exposes scenario discovery and focused test-run tools for coding agents.

## Create the Report

First run your test suite so the adapter writes a raw run (JS/TS reporters write
`reports/raw-run.json`; the non-JS adapters write `.executable-stories/raw-run.json`).
Then turn it into the StoryReport the server reads:

```bash
executable-stories format .executable-stories/raw-run.json \
  --format story-report-json,scenario-index-json,behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Default StoryReport path used by the MCP server:

```text
reports/index.story-report.json
```

## Run

```bash
npx executable-stories-mcp
```

The binary speaks the MCP stdio transport. To register it with an MCP client
(Claude Code, Claude Desktop, Cursor), add it to the client's `mcpServers` config:

```json
{
  "mcpServers": {
    "executable-stories": {
      "command": "npx",
      "args": ["executable-stories-mcp"]
    }
  }
}
```

For an HTTP interface, see [HTTP API](#http-api-optional) below.

## Tools

### Read-only (StoryReport query)

- `list_scenarios` — scenario index items with status, source, tags, tickets, covers, steps, doc kinds, errors. Optional `statuses` / `tags` / `sourceFiles` filters
- `get_scenario` — one scenario by id or exact title
- `get_failing_scenarios` — failed scenarios only
- `get_scenarios_for_paths` — code→scenario: scenarios whose declared `covers` globs match given product-code paths
- `get_feature_summary` — per-feature pass/fail counts
- `get_scenario_index` — Storybook-like `scenario-index` v1 artifact
- `get_behavior_manifest` — tags, source files, doc coverage, debugger warnings (incl. `missing-covers`)
- `get_behavior_diff` — compare two StoryReports by scenario id (regressed / fixed / added / removed)
- `get_trajectory` — session delta ("passed N → M since you started"). Folds the current report into a persisted session baseline (`.executable-stories/trajectory.json`) and returns count deltas vs the session start and vs the previous run. Idempotent on the observed state (runId + counts) — re-reading an unchanged report does nothing, while a new full run or a focused-run refresh advances it. Pass `reset` to start a fresh session. Use it as the observe signal in an agent loop
- `get_loop_status` — the one-read "am I done?". Composes the failing list, the regression set (vs an optional `baselineReportPath`), and the session trajectory into a single `done` verdict (nothing failing and nothing regressed). Poll this to decide whether to keep looping
- `get_deployment_status` — latest recorded deployment per environment (from the deployment ledger)
- `get_environment_drift` — scenario drift between two environments (what's in one but not the other)

### Execution

Frameworks: `vitest`, `jest`, `playwright`, `cypress`, `go`, `pytest`, `rust`, `dotnet`. The framework is inferred from the source file for playwright/cypress/go/pytest; vitest/jest/rust/dotnet need an explicit `framework`. After a run, the result is merged back into the StoryReport (surgical patch by scenario id, summaries recomputed) so the read-only tools see fresh state. The raw JSON is read from `rawRunPath` (default `.executable-stories/raw-run.json`); if none is found the report is left intact and the result carries `refresh.reportRefreshed: false`. Disable with `refreshReport: false`.

- `run_scenario` — run one scenario by id or title. **Executes real tests.**
- `run_scenarios` — run several scenarios (`idsOrTitles`) in sequence, refreshing after each
- `run_changed` — code → run: run the scenarios whose `covers` globs match the given changed-file `paths`. The "I edited these files, verify the behaviours that cover them" act

Each read-only tool accepts optional `reportPath` to point at a specific StoryReport JSON file.

## Contract

StoryReport v1 JSON remains the canonical artifact:

```bash
executable-stories format <raw-run.json> --format story-report-json
```

MCP is a query and optional execution layer over that artifact.

## HTTP API (optional)

For non-MCP clients or local debugging, start the HTTP server programmatically (the `executable-stories-mcp` binary itself only speaks stdio):

```typescript
import { startHttpServer } from "executable-stories-mcp/http";
await startHttpServer({ reportPath: "reports/index.story-report.json", port: 7357 });
```

Endpoints (each maps to the matching MCP tool):

- `GET /health`
- `GET /scenarios` (optional `?status=&tag=&sourceFile=`) → `list_scenarios`
- `GET /scenarios/failing` → `get_failing_scenarios`
- `GET /scenarios/covering?path=…` → `get_scenarios_for_paths`
- `GET /scenarios/:id` → `get_scenario`
- `GET /scenarios-index` → `get_scenario_index`
- `GET /features` → `get_feature_summary`
- `GET /manifest` → `get_behavior_manifest`
- `GET /diff?baseline=&current=` → `get_behavior_diff`
- `GET /trajectory` (optional `?reset=true`) → `get_trajectory`
- `GET /loop-status` (optional `?baseline=`) → `get_loop_status`
- `POST /run-scenario` → `run_scenario` (body: `idOrTitle`, optional `framework` / `cwd` / `rawRunPath` / `refreshReport`)
- `POST /run-scenarios` → `run_scenarios` (body: `idsOrTitles`, …)
- `POST /run-changed` → `run_changed` (body: `paths`, …)

Every GET accepts a `?reportPath=` query parameter.
