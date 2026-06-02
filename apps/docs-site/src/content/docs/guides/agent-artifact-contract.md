---
title: Agent artifact contract
description: Use executable-stories as behavior context for coding agents
---

Executable Stories can publish a behavior catalog for coding agents. Tests stay in the host framework; agents read generated artifacts.

## Canonical Artifact

Use StoryReport v1 JSON as the stable machine contract:

```bash
executable-stories format .executable-stories/raw-run.json --format story-report-json
```

Default output (with `--output-name index`):

```text
reports/index.story-report.json
```

StoryReport v1 contains:

- run metadata: id, timestamps, project root, package version, git SHA, CI info
- features: title, source file, status summary
- scenarios: id, title, status, duration, tags, tickets, `covers`, source line, docs, steps, attachments
- steps: keyword, text, status, duration, errors, doc entries

### Code → scenario (`covers`)

Scenarios declare the product-code paths/globs they exercise via a `covers` option (project-root-relative), beside `tags`/`tickets`. It travels through the StoryReport contract in every language adapter. Agents invert it with the `get_scenarios_for_paths` MCP tool (or `GET /scenarios/covering`): pass the files you're editing, get the behavior at risk. Scenarios with no `covers` surface as a `missing-covers` warning in the behavior manifest's debugger.

Agents should depend on this artifact before reading prose docs.

## Agent Index

Preferred: generate the scenario index artifact from RawRun:

```bash
executable-stories format .executable-stories/raw-run.json \
  --format scenario-index-json \
  --output-dir reports \
  --output-name index
```

Output: `reports/index.scenarios-index.json`

Legacy alternative (same shape, fewer metadata fields):

```bash
executable-stories list .executable-stories/raw-run.json --list-format json
```

The index includes scenario id, title, status, source file/line, tags, tickets, steps, doc kinds, and errors.

## Behavior Manifest

For agent-oriented discovery and quality signals:

```bash
executable-stories format .executable-stories/raw-run.json \
  --format behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Output: `reports/index.behavior-manifest.json` — source file rollups, tag index, doc coverage, debugger warnings (missing tags, missing source lines, etc.).

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
  --format story-report-json,scenario-index-json,behavior-manifest-json,release-manifest,html,markdown \
  --output-dir reports \
  --output-name index
```

Publish as CI artifacts:

- `reports/index.story-report.json`
- `reports/index.scenarios-index.json`
- `reports/index.behavior-manifest.json`
- `reports/index.release-manifest.md`

Example apps expose `pnpm report:agents` with this recipe.
