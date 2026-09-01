---
title: Agent artifact contract
description: Use executable-stories as behavior context for coding agents
---

Executable Stories can publish a behavior catalog for coding agents. Tests stay in the host framework; agents read generated artifacts.

## What the artifacts cover

Executable Stories has three related artifacts. A framework's `raw-run.json` is the execution that just happened. Each test source file also owns persistent canonical state under `<outputDir>/by-file/`. A generated StoryReport is a whole-suite snapshot when it is rendered from that directory, or when a documentation format updates and reads that state. Keep those boundaries explicit: `check`, `list`, `review`, `check-explainers`, `goal`, and `triage` accept either one run file or a `by-file/` directory. They aggregate only when you pass the directory; passing `raw-run.json` always means the current execution.

| Field           | Where         | Meaning                                                                                                                                      |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `lastRunAtMs`   | each scenario | When that scenario last actually ran (epoch ms). Present on scenarios read from persistent per-file state.                                   |
| `lastRunGitSha` | each scenario | The commit it last ran against.                                                                                                              |
| `runScope`      | RawRun        | `"full"` (no name filter applied), `"filtered"` (one was), or absent when the adapter cannot tell. Only `"full"` lets a scenario be retired. |

**Read `lastRunAtMs` before trusting a green.** A scenario can be passing in the report and not have run since a commit that changed the code under it. Compare it against `lastRunGitSha` and rerun anything you are about to rely on.

**Say so when you narrow a run.** An agent shelling out to `vitest -t` or `jest -t` gets this for free — those adapters read their own filter. Driving Cypress, JUnit 5 or xUnit through a filter means declaring it (`EXECUTABLE_STORIES_FILTERED=1`, or the Cypress reporter option). Undeclared, the run reports no scope, which keeps the file's other scenarios and warns rather than retiring them: incomplete detection leaves stale data, never missing data. The MCP `run_scenario` tool handles this itself.

**Combine reports explicitly for a stable snapshot.** `executable-stories format reports/by-file --format story-report-json` reads every per-file report without updating or restamping them. Formatting one `raw-run.json` first updates the reports owned by that execution, then renders documentation formats from the accumulated state. Execution formats—JUnit, Cucumber, and the release manifest—always describe only that execution.

## Canonical Artifact

Use StoryReport v1 JSON as the stable machine contract:

```bash
executable-stories format reports/by-file --format story-report-json
```

Default output (with `--output-name index`):

```text
reports/index.story-report.json
```

StoryReport v1 contains:

- run metadata: id, timestamps, project root, package version, git SHA, CI info
- features: title, source file, status summary
- scenarios: id, title, status, duration, tags, tickets, `covers`, source line, docs, steps, attachments
- steps: keyword, text, status, duration, optional assertion count, errors, doc entries

### Code → scenario (`covers`)

Scenarios declare the product-code paths/globs they exercise via a `covers` option (project-root-relative), beside `tags`/`tickets`. It travels through the StoryReport contract in every language adapter. Agents invert it with the `get_scenarios_for_paths` MCP tool (or `GET /scenarios/covering`): pass the files you're editing, get the behavior at risk. Scenarios with no `covers` surface as a `missing-covers` warning in the behavior manifest's debugger.

Agents should depend on this artifact before reading prose docs.

## Agent Index

Preferred: generate the scenario index from the whole-suite per-file state:

```bash
executable-stories format reports/by-file \
  --format scenario-index-json \
  --output-dir reports \
  --output-name index
```

Output: `reports/index.scenario-index.json`

Legacy alternative (same shape, fewer metadata fields):

```bash
executable-stories list .executable-stories/raw-run.json --list-format json
```

The index includes scenario id, title, status, source file/line, tags, tickets, steps, doc kinds, and errors.

## Behavior Manifest

For agent-oriented discovery and quality signals:

```bash
executable-stories format reports/by-file \
  --format behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Output: `reports/index.behavior-manifest.json` — source file rollups, tag index, doc coverage, debugger warnings (missing tags, missing source lines, etc.).

## Chat Paste (`agent-text`)

Not every model reading your run is a coding agent with tools. Sooner or later a product owner pastes the HTML report into ChatGPT and asks "what does this product do?". A 1.3&nbsp;MB report overflows the context window, so the model answers from whatever fraction survived truncation, without saying so.

`agent-text` is the artifact for that paste: the full run (steps, doc entries, errors) as flat plain text, with a self-describing header and none of the tokens a model never reads (ids, hashes, durations, markup).

```bash
executable-stories format .executable-stories/raw-run.json --format agent-text
```

Output: `reports/index.agent.txt`. On a real 74-scenario run: HTML 1,312&nbsp;KB (~330k tokens), `agent-text` 107&nbsp;KB (~27k tokens). The same behavior, at a size a chat window actually keeps. For tool-using agents, prefer the JSON artifacts above; this format optimizes tokens, not parseability.

## Release Manifest

For release evidence, generate a tested-together manifest:

```bash
executable-stories format .executable-stories/raw-run.json \
  --format release-manifest \
  --output-dir reports \
  --output-name index
```

Output: `reports/index.release-manifest.md`.

The manifest records scenario ids, titles, statuses, source files, tags, branch/commit metadata when present, and a SHA-256 hash built from the exact scenario/status set. Use it when an agent or reviewer needs to confirm what batch was tested before a release.

## Agent Loop

1. Run framework tests.
2. Generate StoryReport + index + manifest.
3. Query failing scenarios or browse the index.
4. Inspect scenario source files.
5. Change product code or tests.
6. Rerun focused or full tests.
7. Regenerate artifacts.

The framework remains the execution layer. Executable Stories supplies behavior context and evidence.

For loop-shaped, unattended agents, three commands wrap this loop: `triage` (the worklist of what to fix), `check` (the per-turn backpressure signal), and `goal` (a behavioral definition-of-done with an anti-fake-done ratchet). See [Agent loops and backpressure](/guides/agent-loops/).

## MCP

Use `executable-stories-mcp` when an MCP-capable agent needs direct tools:

```bash
npx executable-stories-mcp
```

Read-only tools:

- `list_scenarios` (optional `statuses` / `tags` / `sourceFiles` filters)
- `get_scenario`
- `get_failing_scenarios`
- `get_scenarios_for_paths` — code→scenario via declared `covers`
- `get_feature_summary`
- `get_scenario_index`
- `get_behavior_manifest`
- `get_behavior_diff` — regressed / fixed / added / removed between two reports
- `get_deployment_status` — latest recorded deployment per environment
- `get_environment_drift` — scenarios only in one environment and status drift for shared scenarios

Execution tool:

- `run_scenario` — runs one scenario through vitest, jest, playwright, or cypress

Each tool reads StoryReport v1 JSON. By default it uses:

```text
reports/index.story-report.json
```

Pass `reportPath` to use another file. See [MCP server](/guides/mcp-server/).

## WebMCP (in the reader's browser)

Everything above assumes an agent with a filesystem. Someone reading a published
report has a different agent: the one in their browser, pointed at a shared URL
or a self-contained `report.html`. The interactive HTML report registers WebMCP
tools on `document.modelContext` for exactly that reader.

Read tools, answering from the run already embedded in the page:

- `list_scenarios` (optional `statuses` / `tags` / `sourceFiles` filters)
- `get_scenario`
- `get_failing_scenarios`
- `get_feature_summary`

Names and payload shapes mirror the MCP tools above — both go through the shared
projections in `executable-stories-core/report-queries` — with one licensed
difference: the browser payload has no `hash` field, because scenario content
hashes come from `node:crypto`.

View tool:

- `filter_scenarios` — sets the report's `search`, `status` and `tags`. Omitted
  fields are left alone; an empty string, `"all"`, or an empty array clears one.
  The reader gets a dismissible strip saying an agent filtered the report, with
  a "Show all" reset.

Every payload carries the run's `runId`, commit, branch and `ageDays`, so an
answer about a stale report cannot read as current. Each scenario also carries
`assertionState` (`asserted` / `unasserted` / `unobserved`) and per-step
`assertions` counts, so a passing scenario that checked nothing cannot be read
as proof.

Not available here, by construction: `get_scenario_index` and
`get_behavior_manifest` (node-only content hashing) and `run_scenario` (a static
page has no backend). Use the MCP server for those.

Two constraints worth knowing:

- **Interactive mode only.** The tools ship with the report's hydration island,
  so a report rendered without it registers nothing. The embedded run JSON at
  `#es-report-data` is emitted either way, so a JS-less report is still
  parseable.
- **Progressive.** WebMCP is behind a flag or origin trial in Chrome and Edge
  and absent everywhere else. Without `document.modelContext` nothing registers,
  nothing is logged, and the report behaves exactly as it did before.

## Live index (watch)

Keep the agent artifacts fresh while you work. `executable-stories watch` regenerates the requested formats whenever the framework rewrites its raw-run file:

```bash
executable-stories watch reports/raw-run.json \
  --format story-report-json,scenario-index-json,behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Pair it with the host framework's own watch mode (`vitest --watch`, `jest --watch`, …): tests rerun on code change → raw-run is rewritten → the index regenerates automatically. It is language-agnostic — any adapter that emits a raw-run drives it. Change events are debounced and overlapping runs are coalesced. The same step is available programmatically via `startWatch` / `regenerateArtifacts` from `executable-stories-formatters`.

## CI Recipe

Recommended CI flow:

```bash
pnpm test
executable-stories format reports/raw-run.json \
  --format story-report-json,scenario-index-json,behavior-manifest-json,agent-text,release-manifest,traceability-matrix,html,markdown \
  --output-dir reports \
  --output-name index
```

Publish as CI artifacts:

- `reports/index.story-report.json`
- `reports/index.scenario-index.json`
- `reports/index.behavior-manifest.json`
- `reports/index.agent.txt`
- `reports/index.release-manifest.md`
- `reports/index.traceability-matrix.md`

Example apps expose `pnpm report:agents` with this recipe.
