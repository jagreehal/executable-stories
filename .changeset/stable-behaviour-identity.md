---
"executable-stories-formatters": minor
---

Add rename/move-resilient behaviour identity to the run diff.

`diffRuns` now re-pairs id-unmatched scenarios whose content (steps + `covers`) is preserved across a title change or file move, classifying them as new `renamed` / `moved` change kinds instead of a false `removed` + `added`. Matching is conservative: an exact content fingerprint first, then a guarded fuzzy pass that only accepts a unique best match at or above 0.75 similarity — anything ambiguous stays add/remove.

Because renames and moves no longer count toward `summary.added` / `summary.removed`, the release gate (`--fail-on-removal` / `--fail-on-new`) no longer fails a release on a pure test rename. New `behaviourFingerprint` / `behaviourSimilarity` helpers are exported for reuse.
