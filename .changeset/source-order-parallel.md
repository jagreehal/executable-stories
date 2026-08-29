---
"executable-stories-formatters": patch
---

Report scenarios in source order when tests run in parallel

`sortScenarios: "source"` ordered by `story.sourceOrder`, a counter incremented on
each `story.init()` call — execution order, not source order. Under parallel
workers each worker restarts it at zero, so a suite came out shuffled and could
reorder itself when a worker was added.

Ordering now uses `sourceLine`, which adapters already record from the framework's
own location for each test. Markdown and Confluence share one comparator.
Single-worker runs are unchanged.
