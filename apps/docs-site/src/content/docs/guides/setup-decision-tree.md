---
title: Setup decision tree
description: Choose the right executable-stories packages and workflows for your goal
---

Use this page to pick packages and commands without reading every README first.

## What is your goal?

### Integrate story tests into an existing test suite

1. Install the adapter for your framework or language (see [Package map](/reference/package-map/)).
2. Configure the reporter with `rawRunPath` so CI writes RawRun JSON.
3. Add `executable-stories-formatters` for report generation.

| Stack | Package | Reporter config |
| --- | --- | --- |
| Vitest | `executable-stories-vitest` | `StoryReporter` + `rawRunPath` |
| Jest | `executable-stories-jest` | Jest reporter + `rawRunPath` |
| Playwright | `executable-stories-playwright` | Playwright reporter + `rawRunPath` |
| Cypress | `executable-stories-cypress` | Cypress reporter + `rawRunPath` |
| Go / pytest / Ruby / Rust / JVM / .NET | language package | default `.executable-stories/raw-run.json` |

Quick bootstrap for JS projects: `executable-stories-init`.

### Publish human-readable docs from CI

After tests write RawRun JSON:

```bash
executable-stories format reports/raw-run.json --format html,markdown --output-dir reports
```

For a Starlight/Astro docs site from artifacts: `executable-stories-demo` or formatters `init-astro` — see [Astro docs site](/guides/astro-docs-site/).

### Enable coding agents (behavior catalog)

Emit machine artifacts in CI:

```bash
executable-stories format reports/raw-run.json \
  --format story-report-json,scenario-index-json,behavior-manifest-json \
  --output-dir reports \
  --output-name index
```

Optional MCP: [MCP server](/guides/mcp-server/) (`executable-stories-mcp`).

Full contract: [Agent artifact contract](/guides/agent-artifact-contract/).

### Feed a test-management system (TestRail, Jira)

Start read-only. `coverage` needs one API key and writes nothing:

```bash
executable-stories coverage testrail reports/raw-run.json
```

It tells you how many cases your stories already cover and which manual cases duplicate one. When you want the system updated from the same run, `sync` authors the cases, records the executions, and attaches the evidence. See [TestRail & Xray sync](/guides/test-management-sync/).

Jira appears in two unrelated workflows here. Pick by what you want to land in Jira:

| You want | Command | Guide |
| --- | --- | --- |
| Test cases and executions in Jira | `sync xray` | [TestRail & Xray sync](/guides/test-management-sync/) |
| Living docs in a Jira issue or Confluence page | `publish-jira`, `publish-confluence` | [Publishing to Confluence & Jira](/guides/publishing-to-atlassian/) |
| A link from a scenario to its ticket | `story.init(task, { ticket })` | [Vitest story API](/reference/vitest-story-api/) |

### Embed reports in a React product

1. Generate StoryReport JSON in CI (see above).
2. Install `executable-stories-react`.
3. Render the report in your app — see [Embed reports in React apps](/guides/embed-in-react-apps/).

### Verify cross-language parity

Non-JS adapters must produce RawRun compatible with the shared formatter pipeline. See [Cross-language parity](/reference/cross-language-parity/) and run:

```bash
pnpm run verify:go
pnpm run verify:pytest
pnpm run verify:ruby
# … etc.
./scripts/verify-all.sh
```

## Overlap clarified

| Package | Use it for | Not for |
| --- | --- | --- |
| `executable-stories-formatters` | CLI, all output formats, validation | In-test story API |
| `executable-stories-init` | First-time JS wiring | Non-JS adapters |
| `executable-stories-demo` | Demo/publish site from artifacts | In-process test API |
| `executable-stories-react` | Product UI embedding | Static HTML reports (use formatters HTML) |
| `executable-stories-mcp` | Agent query + focused runs | Replacing your test runner |

## Example app scripts

Monorepo example apps include `report:agents`:

```bash
cd apps/vitest-example && pnpm test:report
```

This runs tests, then generates StoryReport, scenario index, and behavior manifest under `reports/`.
