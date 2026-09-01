---
"executable-stories-core": minor
"executable-stories-react": minor
"executable-stories-formatters": minor
"executable-stories-mcp": patch
---

Let a browser agent read and drive the HTML report (WebMCP)

The report already served coding agents through the MCP server and StoryReport
JSON, both of which need a filesystem. This adds a channel for the reader who has
neither: someone with a browser agent open on a shared report URL.

The interactive report registers WebMCP tools on `document.modelContext`.
`list_scenarios`, `get_failing_scenarios`, `get_feature_summary` and
`get_scenario` answer from the run already embedded in the page;
`filter_scenarios` sets the search, status and tag filters, and a dismissible
strip tells the reader an agent did it. The four reads mirror the MCP server's
names, sharing new projections in `executable-stories-core/report-queries` so the
two transports cannot drift. `get_scenario_index`, `get_behavior_manifest` and
`run_scenario` stay MCP-only — the first two hash with `node:crypto`, and a
static page has no backend.

Every payload carries the run's id, commit, branch and age in days, and every
scenario carries `assertionState` (`asserted` / `unasserted` / `unobserved`) plus
per-step `assertions` counts, so neither a stale report nor a passing scenario
that checked nothing can be relayed as proof. Both fields are new on the
`scenario-index` artifact too, additive within schema v1.

`getScenario` now searches every scenario id before any title, so an id wins over
a scenario merely titled the same. The run JSON embedded in the HTML is emitted
even without the interactive island, keeping a JS-less report parseable.

Progressive: without `document.modelContext` nothing registers and nothing
changes.
