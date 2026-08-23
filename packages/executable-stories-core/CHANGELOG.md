# executable-stories-core

## 0.20.0

### Minor Changes

- c8fe24a: Let a file declare what its scenarios are for, take any framework's results, and stop losing switched-off scenarios in a count

  **A file can say why its feature exists.** A scenario says what the system does; nothing said who it serves. `story.feature(...)`, in all eleven adapters, declares a title, a kind (`feature`, `ability`, or `business-need`), a markdown narrative, and a glossary, and the report opens with that before the examples. Files that declare nothing render exactly as they did. Tags on a declaration now reach every scenario in its file, which is what they were documented to do and the reason to write one on the declaration rather than on each scenario. Go and Rust scenarios record the file they were written in, so a declaration made in `init()` or through `declare_feature!` reaches them instead of leaving every scenario under "unknown". Playwright keys declarations on the declaring file: a worker reused across specs used to hand one file's feature to the next, and the reporter recorded it against a file that never wrote one.

  **Less per-test ceremony in three adapters.** Rust required `story.pass()` in every passing test; a story dropped without it recorded a failure, so a forgotten call turned a green test red in the docs only. Status now comes from whether the thread is unwinding. `#[test]` functions returning `Result` are the one case that cannot be detected, since returning `Err` never panics: pass the fallible call through `story.record_result(...)` or call `story.fail()`. Ruby required `story.record(status: "pass", ...)` after the assertions, which a failing test never reached, so failures were the one thing the report could not show; `require "executable_stories/minitest"` now hooks `after_teardown`. xUnit required `Story.RecordAndClear()` per test wrapped in try/catch, and one `[assembly: StoryRecording]` now covers a whole test project.

  **`push` takes any framework's results.** It already took a StoryReport or a raw run, and now also takes JUnit XML, Playwright's JSON reporter, and an allure-results directory, which the cloud converts at the edge. The format is detected from what you point at rather than selected by subcommand, and `--format story|junit|playwright|allure` overrides when detection guesses wrong; a declared `schemaVersion` always wins, so a StoryReport is never mistaken for something else. Foreign formats upload verbatim so the conversion rules live in one place instead of drifting between the server and every version of this CLI in the wild. An allure-results directory is read the way Allure writes it, and change metadata is capped to fit in a request URL so a large PR cannot lose its run to a 414.

  **`--force` keeps a blinking endpoint out of your build.** A CI job that goes red because the reporting endpoint blinked teaches people to stop reporting. It covers the wire, never the verdict: `--gate` still runs after a forced failure and still exits 5 on a blocked release, because a release blocked against a commit was blocked before the push and is not un-blocked by the push failing to land.

  **`check` names switched-off scenarios instead of counting them.** A run could stop validating forty specs and still print `All scenarios green.` under a `40 skipped` count, which is how a turned-off spec gets forgotten. Each one is now listed with its location and its ticket, or `no ticket`, and such a run reads `All running scenarios green.` Planned (`it.todo`) scenarios are a spec waiting for code rather than one you stopped validating, so they stay out of that list. `--max-skipped <n>` puts a budget on it and exits 5 when it is exceeded — worth setting to 0 in an agent loop, where making a scenario skip is the cheapest way out of a red run.

  **Explorer filters live in the URL.** `?q`, `?status`, and `?tag` are read on load and written back as you filter, so `/explorer/?tag=capability:checkout` is an address a ticket can hold. Link by tag rather than at one scenario's page: specifications get renamed, moved, split, and merged as the domain model changes, and a tag survives all four. A tag with nothing behind it renders empty, so a link that has gone stale says so instead of quietly reading as green.

  **The formatters package is lint clean and has a `lint` script**, so `pnpm quality` covers it. Most of the 64 accumulated errors were dead weight, but `build-gherkin-document` computed a resolved keyword type for And/But steps and then emitted the raw one, so the inheritance that block was written for never applied; the AST is right to keep `Conjunction` there and `resolvePickleStepTypes` already does the inheritance where it belongs. Modules that were only named `index.ts` now have names that say what they are — `report-generator.ts`, `compare/diff-runs.ts`, `deploy/deployments.ts`, `notifiers/send-notifications.ts`, `sync/adapters/registry.ts`, `formatters/cucumber-messages/formatter.ts` — with `index.ts` re-exporting them, so nothing changes for anyone importing the package. For core, `canonicalizeRun` moves into the new `converters/acl/canonicalize` subpath, and `converters/acl/index` still re-exports it.

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
