---
"executable-stories-formatters": minor
"executable-stories-mcp": minor
"executable-stories-react": minor
---

**Push.** `executable-stories push` takes `--title` to name the run on the cloud, `--env` to record the environment it reports from, and `--description <text|@file.md>` to show Markdown above the results, so an agent's analysis or a release note travels with the run. Foreign formats carry these in the request URL; a push whose encoded URL would exceed 8 KB is refused before sending, with the fix named. Sharded CI jobs aggregate `reports/by-file` with `format` and push once; two shard reports for the same source file merge.

**MCP.** `executable-stories-mcp --tools read` (or `EXECUTABLE_STORIES_MCP_TOOLS=read`) registers only the observe tools, for review sessions and long agentic sessions. The hosted server accepts an API key or OAuth 2.1.

**Report.** The feature glossary and consecutive `story.kv()` entries render as aligned two-column grids. Feature headers count pending (`it.todo`) scenarios separately from skipped, matching the summary card and the Planned badge. `story.section` Markdown is dedented before rendering, so a section written as an indented template literal inside a test renders as prose in the HTML and Markdown reports. `DocKv` takes `entries: ReportDocKv[]`.

**Skills.** The Vitest, Jest, Playwright and Cypress story-API skills document `story.feature` (narrative, glossary, kind, file-wide tags) and Markdown authoring in `story.section`. The CLI skill documents the Markdown formatter options and the push flags; the agent-loop skill documents the read-only MCP profile.
