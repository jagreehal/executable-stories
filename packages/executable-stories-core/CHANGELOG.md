# executable-stories-core

## 0.19.0

### Minor Changes

- 6ce9ac2: Consume `executable-stories-core` as a published dependency instead of bundling it.

  `executable-stories-core` is now published to npm, so the packages that share its
  types and converters declare it as a real dependency rather than inlining it at
  build time. This removes the `noExternal` / `dts.resolve` workarounds from five
  tsup configs and the `paths` aliases from two tsconfigs, and it stops five
  published dists from each shipping their own copy of the ACL and converter code
  (a copy that could silently diverge when packages released at different times
  were installed together).

  The framework adapters (Vitest, Jest, Playwright, Cypress) now take their shared
  story types, `STORY_META_KEY`, and the OTel/doc-builder helpers from
  `executable-stories-core` instead of routing them through
  `executable-stories-formatters`. The Jest, Playwright, and Cypress story APIs no
  longer load the formatters package at test time at all; Cypress in particular no
  longer needs its special-case import to keep `node:fs` out of the browser bundle.

  `tryGetActiveOtelContext`, `resolveTraceUrl`, and `OtelTraceContext` moved from
  `executable-stories-formatters` into `executable-stories-core/utils/otel-detect`.
  They are still re-exported from `executable-stories-formatters`, so no public API
  changes.

## 0.18.1

### Patch Changes

- 3aad59f: Mark executable-stories-core and the cypress/jest/playwright/vitest example apps `private: true` so `changeset publish` never attempts to create a new npm package name. All five are private and never published; no published package changes.

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
