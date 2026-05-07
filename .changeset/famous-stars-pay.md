---
'executable-stories-formatters': patch
'executable-stories-playwright': patch
---

Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.
