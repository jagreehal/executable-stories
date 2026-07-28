---
"executable-stories-vitest": minor
"executable-stories-jest": minor
"executable-stories-playwright": minor
"executable-stories-cypress": minor
"executable-stories-formatters": minor
"executable-stories-react": minor
"executable-stories-astro": minor
---

State snapshots, persona-lens follow-ups, and an LLM-paste output format.

**New `state` doc kind** — `story.state({ label?, value })` captures what the world looks like at a step as a JSON-serializable snapshot (e.g. the Basket after adding an item). Storyboards are no longer screenshot-only: a step carrying a screenshot or state docs becomes a filmstrip frame, consecutive same-label snapshots render as diffs derived at render time (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Journey pages show each chapter's final state card, and `/states` gives non-UI scenarios data-card thumbnails. HTML and Astro render diff-first cards, Markdown shows compact diff summaries with a collapsed snapshot, and story-report-json/MCP carry the entries via the schema; JS adapters warn above ~100KB per snapshot.

**Design context strip** (`executable-stories-astro`) — `story.link()` docs pointing at a design tool (Figma, Zeplin, Sketch) or labelled "Design ..." now render as a **Design** strip at the top of story pages and journey pages, so designers land on the mockup next to the proof. Pure presentation over existing docs, no new story API. New exports: `designLinks()`, `isDesignLink()`, `<DesignContext/>`.

**Journey run history** (`executable-stories-astro`) — point the config's new `historyFile` at the store the CLI's `--history-file` maintains and journey pages show a journey-level badge ("7/10 recent runs passed · flaky"), aggregated from the member scenarios' histories: a journey fails a run when ANY member failed it. Same status-transition flakiness classification as the CLI and report island. New exports: `journeyRunHistory()`, `aggregateJourneyHistory()`, `readHistoryStore()`.

**Environment drift page** (`executable-stories-astro`) — sites with two or more `sources` (staging vs production, one run per repo in a docs hub) get a `/drift` page: every scenario's status per source side by side, mismatches floated to the top, including scenarios absent from one source. Injected automatically with ≥2 sources; `injectDrift`/`driftBase` override. New exports: `extractDrift()`, `driftEnabled()`.

**Evidence grade in the traceability CSV** (`executable-stories-formatters`) — `traceability-csv` gains an `evidence_grade` column: the same weak → strong grading the Evidence Review applies (screenshot, OTEL trace, mutation score, failing-first verification), so the auditor spreadsheet says not just "passed" but how credible the proof is.

**Regression storyboards in `compare`** (`executable-stories-formatters`) — the run-diff HTML report now renders a step-screenshot filmstrip on every scenario whose status flipped (regressed or fixed), so triage starts from what the product looked like, not a stack trace. Frames come from the same step-attached screenshots the report filmstrip uses.

**New `agent-text` output format** (`executable-stories-formatters`) — the full run (steps, doc entries, errors) as flat, token-lean plain text for pasting into an LLM. Same content as the Markdown report minus everything a model never reads (ids, hashes, durations, source lines, JSON punctuation), with a self-describing header so the model knows how to read the block. ~12x smaller than the HTML report on a real 74-scenario run. Added to the `agent` preset; writes `<name>.agent.txt`.
