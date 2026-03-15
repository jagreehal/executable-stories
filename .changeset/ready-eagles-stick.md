---
'executable-stories-formatters': minor
'executable-stories-playwright': patch
'executable-stories-vitest': patch
'executable-stories-jest': patch
---

- **formatters:** Add `--html-theme` with six built-in themes (default, corporate, terminal, minimal, dashboard, playful). Add run-diff formatters (HTML and Markdown) for comparing baseline vs current runs, plus `diffRuns`, `listScenarios`, and `selectTestCases` APIs. Add failure-summary renderer in HTML report.
- **playwright, vitest, jest:** Align story API and reporter output with formatters (themes, run-diff, scenario listing).
