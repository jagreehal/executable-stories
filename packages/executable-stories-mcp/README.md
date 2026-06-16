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
- `get_deployment_status` — latest recorded deployment per environment (from the deployment ledger)
- `get_environment_drift` — scenario drift between two environments (what's in one but not the other)

### Execution

- `run_scenario` — run one scenario via the host framework (`vitest`, `jest`, `playwright`, or `cypress`). **Executes real tests.**

Each tool accepts optional `reportPath` to point at a specific StoryReport JSON file.

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
- `POST /run-scenarios` → `run_scenario`

Every GET accepts a `?reportPath=` query parameter.
