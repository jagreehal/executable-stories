---
"executable-stories-formatters": minor
"executable-stories-react": minor
"executable-stories-vitest": minor
"executable-stories-jest": minor
"executable-stories-mcp": patch
"executable-stories-astro": patch
"executable-stories-cypress": patch
---

**Self-contained packaging (publish fix).** `executable-stories-core` is now an
internal, unpublished workspace package: every package that used it now bundles
its code into their own dist (via tsup `noExternal`) and lists it under
`devDependencies` instead of `dependencies`. Published packages no longer carry
a runtime dependency on `executable-stories-core`, so `npm install` resolves
without it. This releases fixed versions of `executable-stories-formatters`,
`executable-stories-react`, `executable-stories-mcp`, `executable-stories-astro`,
and `executable-stories-cypress` (and, via their internal ranges,
`executable-stories-vitest`, `executable-stories-jest`, and
`executable-stories-playwright`). No API or behavior change.

Living-docs trust and change-awareness features: freshness and provenance
chrome, a per-scenario run timeline, flakiness badges, a "Since last run"
header strip, a behavior changelog for `compare`, and planned scenarios from
bodyless `it.todo`.

- **Freshness + provenance chrome (HTML report)**: the interactive report
  header shows a quiet "Verified N ago" line, escalating to a stale-warning
  banner past `--html-stale-after-days` (default 7; `0` disables). Report
  metadata now links branch, PR, and commit when CI detection resolves them,
  and the converters share the comprehensive `detectCI` (GitHub Actions,
  GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis).
- **Per-scenario run timeline**: with `--history-file <path>` (updated before
  report generation, so the current run is the latest entry), each scenario
  card renders a dot per recent run with a tooltip summary like "8/10 runs
  passed · Passing for the last 5 runs". `--max-history-runs <n>` (default 10)
  caps retention. History is presentation-layer only — the StoryReport v1
  contract is unchanged.
- **Flaky badge (executable-stories-react)**: scenarios whose recent runs flip
  between pass and fail get a **Flaky** badge next to the timeline, judged
  over the same window the dots show (same status-transition thresholds as
  the CLI history module).
- **"Since last run" strip (executable-stories-react)**: one line in the
  report header summarizing newly failing (deep-linked), fixed, and
  first-seen scenarios against the previous run in the history. A quiet run
  states "no behavior changes"; the first run with history renders nothing.
- **Behavior changelog (executable-stories-formatters)**: new
  `compare --format changelog` writes a release-notes-style changelog
  (`<output-name>.changelog.md`) between two runs — New behavior (each new
  scenario listed with its Given/When/Then steps so the entry reads as a
  specification), Fixed, Broken, Removed, Renamed or moved (rename/move-
  resilient identity, so refactors don't show as removed + added), and
  Changed. Headers carry each run's `packageVersion`, short commit SHA, and
  date. `RunDiffChangelogFormatter` is exported for programmatic use. The
  Markdown formatter also renders raw-`todo` scenarios with an _(planned)_
  heading suffix.
- **Planned scenarios (core, vitest, jest, react)**: a bodyless
  `it.todo("title")` — which never runs `story.init()` and previously
  vanished from the docs — is now emitted as a planned scenario (raw status
  `todo`, title only, no steps) when its file contains at least one story
  test; files containing only todos still produce nothing. `ReportScenario`
  gains an optional `planned?: boolean` (schema-additive, no breaking change
  for StoryReport v1 consumers), and the HTML report shows a **Planned**
  badge instead of Pending.
