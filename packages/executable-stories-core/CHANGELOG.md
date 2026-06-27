# executable-stories-core

## 0.18.0

### Minor Changes

- d7c4661: Extract the shared report/story types and the ACL converter pipeline into a
  standalone `executable-stories-core` package.
  - Houses the canonical types (`raw`, `test-result`, `story`, `story-report`,
    `cucumber-messages`, `ci`, `otel`), the ACL converters
    (`canonicalizeRun`, `synthesizeStories`, `assertValidRun`, the NDJSON +
    StoryReport converters), the shared doc-builders/duration/source-file utils,
    the theme tokens, and the run-trajectory primitive (`advanceState`,
    `summarizeRun`, `trajectorySummary`).
  - `executable-stories-formatters` and `executable-stories-astro` now consume
    these from core instead of carrying their own copies; the formatters package
    re-exports the moved symbols for backwards compatibility.
