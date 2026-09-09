---
"executable-stories-core": minor
"executable-stories-formatters": minor
"executable-stories-react": minor
"executable-stories-vitest": minor
---

Draw the architecture a run exercised, and carry every doc kind into every format

**`--format span-graph`** renders the architecture from the OTel spans a run
already carries: a component is on the diagram because a span named it while a
scenario ran, an arrow is there because one span was the parent of another
across a component boundary, and both carry the scenario ids that put them
there. "What does this change touch" is answered from the run. Components are
laned by the convention that named them (`http.route` → edge, `peer.service` →
service, `messaging.destination.name` → queue, `db.system` → data), output is
Mermaid, and the graph also renders in the HTML report above the features, each
component listing the scenarios that reached it as links to their cards.
`--baseline <run|auto>` colours what the behavioural diff moved, capped so a hub
on most scenarios is not coloured every run; renames are paired by behaviour
fingerprint through the shared `pairByFingerprint`, which `compare` now calls
too. A run with no spans writes no file, so adding the format to a CI command
costs nothing until something is instrumented. `deriveSpanGraph`,
`spanGraphToMermaid` and `spanGraphDeltaFromRuns` are exported from
`executable-stories-core`.

**Vitest collects the spans for you.** `storySpanCollector()`, a SpanProcessor
exported from `executable-stories-vitest/otel`, keeps the spans that ended during
a trace and the story claims its own at test end, so a suite using Vitest's
OpenTelemetry support feeds the graph with tests written unchanged.
Auto-instrumentation supplies the attributes the graph names components from. A
trace keeps its first 500 spans, an explicit `story.attachSpans()` still wins,
and a trace that collected nothing leaves no key behind.

**Every doc kind now reaches every format.** `assertNever` (exported from
`executable-stories-core/utils/assert-never`) guards the doc-kind switches, so
`story.video()`, file-path `story.screenshot()` and `story.tag()` render in JUnit
XML, Cucumber JSON and agent-text, and the next doc kind is a compile error in
every renderer that has not handled it.

Also in this release:

- **An inline `story.html()` embed sizes itself to its content.** The frame
  measures the bottom edge of body's children and posts its height back, so a
  full-page artifact is shown whole; `height` becomes the placeholder until then.
  Done with an inlined string, no dependency and no network request. Heights are
  accepted only from the component's own frame and capped at 5000px, and `url` /
  `path` embeds keep their declared height.
- **Every generated HTML document carries a tab icon** — the mark the docs site
  uses, drawn and inlined as a data URI so a report stays a single self-contained
  file. A test walks both packages and fails on any document without it.
- **`format --attach-images`** keeps a run's local screenshot and video paths as
  real markdown references and prints the `gh pr comment --attach` command that
  uploads them, so evidence reaches a pull request with no image host (GitHub CLI
  2.99+).
- **`--include`, `--exclude`, `--include-tags` and `--exclude-tags` name any
  selector that matched nothing**, so a filter whose path moved says so.
