---
title: MCP server
description: Read-only and execution MCP tools for executable story behavior catalogs
---

`executable-stories-mcp` exposes StoryReport v1 JSON to MCP-capable coding agents. Read-only tools query the last test run; `run_scenario` optionally re-executes one scenario through the host framework.

## Prerequisites

Generate agent artifacts first:

```bash
pnpm test
executable-stories format reports/raw-run.json \
  --format story-report-json,scenario-index-json,behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Default MCP input path:

```text
reports/index.story-report.json
```

See [Agent artifact contract](/guides/agent-artifact-contract/) for the full CI recipe.

## Install

```bash
pnpm add -D executable-stories-mcp executable-stories-formatters
```

## Run

```bash
npx executable-stories-mcp
```

The server uses stdio transport (standard for Cursor, Claude Desktop, and similar hosts).

## Cursor configuration

```json
{
  "mcpServers": {
    "executable-stories": {
      "command": "npx",
      "args": ["executable-stories-mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

Ensure `reports/index.story-report.json` exists in `cwd`, or pass `reportPath` on each tool call.

## Tools

### Query (read-only)

| Tool | Purpose |
| --- | --- |
| `list_scenarios` | Scenarios with status, tags, steps, doc kinds. Optional `statuses` / `tags` / `sourceFiles` filters |
| `get_scenario` | One scenario by id or exact title |
| `get_failing_scenarios` | Failed scenarios only |
| `get_scenarios_for_paths` | Scenarios whose declared `covers` globs match given product-code paths (e.g. a changed-file list) |
| `get_feature_summary` | Per-feature pass/fail counts |
| `get_scenario_index` | Full `scenario-index` v1 artifact |
| `get_behavior_manifest` | Tags, source files, doc coverage, debugger warnings (incl. `missing-covers`) |
| `get_behavior_diff` | Compare two StoryReports by scenario id: regressed / fixed / added / removed |

### Code → scenario (`covers`)

Scenarios declare which product code they exercise via a `covers` option (globs, project-root-relative), e.g. `story.init(task, { covers: ["src/auth/**"] })`. `get_scenarios_for_paths` inverts that: give it the files you're editing, get back the behavior at risk. This works identically across every language adapter, since `covers` travels through the StoryReport contract.

### Execution

| Tool | Purpose |
| --- | --- |
| `run_scenario` | Run one scenario via vitest, jest, playwright, or cypress |

`run_scenario` accepts:

- `idOrTitle` — lookup from StoryReport
- `framework` — optional; inferred for `.story.spec.ts` (playwright) and `.story.cy.ts` (cypress)
- `cwd` — project root for the test command (defaults to server cwd)
- `reportPath` — optional StoryReport path

Returns exit code, stdout, stderr, and the resolved command.

## HTTP transport (optional)

For non-MCP clients or local debugging, the same read-only catalog and `run_scenario` are available over HTTP. This is a programmatic API — the `executable-stories-mcp` binary itself only speaks stdio.

```typescript
import { startHttpServer } from "executable-stories-mcp/http";

await startHttpServer({
  reportPath: "reports/index.story-report.json",
  port: 7357, // default
  host: "127.0.0.1", // default
});
```

Endpoints (each maps to the matching MCP tool):

| Method & path | Tool equivalent |
| --- | --- |
| `GET /health` | — (liveness check) |
| `GET /scenarios` (optional `?status=&tag=&sourceFile=`) | `list_scenarios` |
| `GET /scenarios/failing` | `get_failing_scenarios` |
| `GET /scenarios/covering?path=…` | `get_scenarios_for_paths` |
| `GET /scenarios/:id` | `get_scenario` |
| `GET /scenarios-index` | `get_scenario_index` |
| `GET /features` | `get_feature_summary` |
| `GET /manifest` | `get_behavior_manifest` |
| `GET /diff?baseline=&current=` | `get_behavior_diff` |
| `POST /run-scenarios` | `run_scenario` |

Every GET accepts a `?reportPath=` query parameter; `POST /run-scenarios` takes a JSON body of `{ framework, sourceFile, scenarioTitle?, cwd? }`.

## Agent loop

1. Run framework tests and emit StoryReport + index in CI or locally
2. Point MCP at the report
3. `get_failing_scenarios` or `get_behavior_manifest` for triage
4. `get_scenario` for steps, docs, errors, source links
5. `run_scenario` to verify a fix (optional)
6. Full test run + regenerate artifacts

Storybook MCP indexes components; executable-stories indexes **behavior scenarios with execution truth**.

## Related

- [Agent artifact contract](/guides/agent-artifact-contract/)
- [Package map](/reference/package-map/)
- [Setup decision tree](/guides/setup-decision-tree/)
