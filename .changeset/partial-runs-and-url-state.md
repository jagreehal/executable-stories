---
"executable-stories-formatters": minor
"executable-stories-react": minor
---

Partial-run compares, view state in the URL, and visible mermaid failures

**`compare` / `gate-release --partial`.** A filtered local run or a CI shard
compared against a full baseline reported every untouched scenario as removed,
failing `--fail-on-removal` for tests the run was never asked to execute. With
`--partial`, the current run's own source files define its scope: baseline
scenarios outside that scope are counted as `notRun` in the diff summary (and
reported in the markdown, HTML, and PR summaries) instead of being classified as
removed. Off by default, since a deleted file and an unselected file are
indistinguishable from the run alone, and guessing wrong would hide a real
deletion from a release gate. `diffRuns(baseline, current, { partialCurrent:
true })` exposes the same behaviour to API consumers.

**View state in the URL.** Search, status filter, active tags and the
documentation toggle are mirrored into the URL fragment, so refreshing keeps the
view and a filtered report can be pasted to someone else. The diff report's
search and kind filter do the same. The fragment rather than the query string:
the flagship surface is a single HTML file opened from disk, where a `file://`
document has an opaque origin. Format is `#<scenario-id>?q=...`, so existing
scenario permalinks are unchanged and a deep link now survives alongside the
filters.

**Mermaid failures are visible.** Diagrams are validated with the library's own
`mermaid.parse()` before rendering. A diagram with a syntax error now shows the
error message above its source instead of silently degrading to a code block. A
missing library (offline, blocked CDN) still falls back quietly, since that is
not the author's mistake.
