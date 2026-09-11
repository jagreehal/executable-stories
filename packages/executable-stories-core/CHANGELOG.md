# executable-stories-core

## 0.26.0

### Minor Changes

- cdcfb3c: Project settings in the config file, ticket links everywhere, and a clearer architecture diagram

  **Flag defaults in the config file.** `executable-stories.config.mjs` / `.js` /
  `.json` now takes a `defaults` object keyed by flag name without the dashes, so
  a project's report settings live in the repo rather than in each CI step:

  ```js
  export default {
    defaults: {
      'output-dir': 'docs',
      'html-title': 'Checkout Stories',
      'html-architecture': true,
      'ticket-url-template': 'https://jira.example.com/browse/{ticket}',
    },
  };
  ```

  Anything typed on the command line wins. A key that is not a flag, or a value of
  the wrong type, is reported by name. Numbers are accepted where a flag takes a
  string, and repeatable flags take a list. The `.json` form gives the non-JS
  adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) the same settings, since they
  reach the prebuilt binary rather than the library.

  **Link templates for every format.** `--ticket-url-template`,
  `--permalink-base-url` and `--trace-url-template` (and the matching top-level
  generator options) say where tickets, sources and traces live, once. Ticket URLs
  are resolved into the StoryReport itself — `toStoryReport` and
  `toStoryReportWithIndex` take a `ticketUrlTemplate` — so the HTML report, the
  Astro pages and `story-report-json` all link a ticket to the same place. A
  per-format option of the same name still wins.

  **"Architecture, as it ran" is opt-in.** `--html-architecture`
  (`html.architecture`, or the `architecture` prop on `<Report>` /
  `<ReportInteractive>`) draws the run's span graph in the HTML report. It stays
  out of the report unless asked for, since only an instrumented run has anything
  to draw. `--format span-graph` still writes the graph as its own file.

  **Clearer diagrams.** The report's mermaid pin moves to 11, and light-theme
  diagrams use mermaid's `neutral` palette — the same theme the static, no-JS
  render already used, so a diagram keeps its colours when the interactive island
  takes over. Node labels get the room they need, the architecture table picks up
  the report's link colour, and Storybook gains `Drawn` stories that render real
  diagrams in both palettes and check that every label fits its box.

  **Table of contents.** The sidebar highlight now follows the scenario you are
  reading all the way to the end of the page.

  Story synthesis is one setting under two spellings: `--synthesize-stories` and
  `--no-synthesize-stories` resolve together, the command line taking precedence
  over the config file and the last spelling typed taking precedence between them.

## 0.25.0

### Minor Changes

- 2f92312: Draw the architecture a run exercised, and carry every doc kind into every format

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

## 0.24.0

### Minor Changes

- 4fdd651: Share a report, with its evidence, as a link.

  `executable-stories share <reports-dir|report.html|report.json>` publishes a
  report to Executable Stories Cloud and prints a link. The screenshots, videos
  and embedded HTML it references go up with it through presigned uploads
  straight to object storage, so the link shows what your local copy shows.
  `--emails` limits it to named people behind a sign-in, and `--expires-days`
  sets the lifetime (default 30, `0` never expires).

  `--html-share` adds a Share button to the HTML report that hands the reader
  that command. Core gains `collectReportAssets` and `rewriteReportAssets`: the
  local files a report points at, and how to re-point them for a host serving the
  report elsewhere.

## 0.23.0

### Minor Changes

- d8681d2: Reports and worklists now answer the questions people arrive with.

  Search matches ticket ids, error text and source paths alongside titles, tags and steps. A red run offers every failure as one agent prompt from the failure banner. Returning readers get a "since your last visit" line covering what changed while they were away, kept in their own browser. Run details names the five slowest scenarios, and `check --max-duration` turns that into a CI budget. `triage --by-owner` groups the worklist by `CODEOWNERS`, routing each failure to the team that owns the code it covers.

## 0.22.0

### Minor Changes

- 96b5a37: Let a browser agent read and drive the HTML report (WebMCP)

  The report already served coding agents through the MCP server and StoryReport
  JSON, both of which need a filesystem. This adds a channel for the reader who has
  neither: someone with a browser agent open on a shared report URL.

  The interactive report registers WebMCP tools on `document.modelContext`.
  `list_scenarios`, `get_failing_scenarios`, `get_feature_summary` and
  `get_scenario` answer from the run already embedded in the page;
  `filter_scenarios` sets the search, status and tag filters, and a dismissible
  strip tells the reader an agent did it. The four reads mirror the MCP server's
  names, sharing new projections in `executable-stories-core/report-queries` so the
  two transports cannot drift. `get_scenario_index`, `get_behavior_manifest` and
  `run_scenario` stay MCP-only — the first two hash with `node:crypto`, and a
  static page has no backend.

  Every payload carries the run's id, commit, branch and age in days, and every
  scenario carries `assertionState` (`asserted` / `unasserted` / `unobserved`) plus
  per-step `assertions` counts, so neither a stale report nor a passing scenario
  that checked nothing can be relayed as proof. Both fields are new on the
  `scenario-index` artifact too, additive within schema v1.

  `getScenario` now searches every scenario id before any title, so an id wins over
  a scenario merely titled the same. The run JSON embedded in the HTML is emitted
  even without the interactive island, keeping a JS-less report parseable.

  Progressive: without `document.modelContext` nothing registers and nothing
  changes.

## 0.21.0

### Minor Changes

- 945b27e: Each test file owns its report, and combined views are derived

  Running one test file used to shrink the whole report to that file. Every other
  scenario disappeared from the docs, and the run JSON that held them was
  overwritten in the same breath, so there was nothing to recover them from.

  The storage unit is now the test source file rather than the run. Each one owns a
  canonical report under `<outputDir>/by-file/`, named after it, so running a file
  rewrites one report and leaves the rest alone. Nothing merges across files and
  there is no hidden state: the reports on disk are the state.

  Any combined view is derived from that directory, explicitly:

  ```bash
  executable-stories format reports/by-file --format html --output-dir reports
  ```

  That is a pure read: it writes no reports and restamps nothing, so looking at a
  directory cannot change what it says. Framework reporters do the same at the end
  of a run, and an Astro `source` may name the directory (the `init-astro` scaffold
  now does).

  `junit`, `cucumber-json`, `cucumber-messages`, `cucumber-html`, and
  `release-manifest` always describe the run in hand rather than the accumulated
  suite. They are records of what a build executed, and reporting a carried-over
  test to CI as freshly passing would be a lie. The CLI summary counts whichever
  set the output actually contains; when a command writes both kinds, it reports
  documentation and execution counts separately.

  Agent commands (`review`, `list`, `check`, `check-explainers`, `goal`, and
  `triage`) accept either one run file or the `by-file/` directory. The file gives
  current-execution truth; the directory explicitly requests accumulated-suite
  truth.

  An Astro `source` reads a directory as canonical and a file as raw without being
  told, since reading canonical reports as raw turns every passing scenario into a
  skipped one.

  Retiring a scenario is the one destructive act, so it takes certainty. Runs
  report `runScope`: `"full"` replaces a file's report and retires what it no
  longer names, `"filtered"` updates only the scenarios it names, and absent —
  the adapter could not tell — keeps the rest. Removal always warns, naming every
  scenario dropped, so an adapter that wrongly claims full coverage is observable
  rather than silent. Vitest, Jest, Playwright, Go, Ruby, pytest and Rust read
  their own filter; Cypress, JUnit 5 and xUnit cannot see theirs and declare it
  with a reporter option or `EXECUTABLE_STORIES_FILTERED`.

  Because a combined view holds results from several runs, each scenario records
  when it last ran and on which commit. The HTML report flags carried-over
  scenarios past the staleness threshold, the metadata table says the view is
  accumulated and over what span, and the CLI names how much of it the run in hand
  produced. `executable-stories runs status` lists the reports with ages; `runs
reset` deletes them.

  A report whose test file no longer exists is dropped, guarded on the run's own
  sources resolving so a mismatched `projectRoot` cannot wipe everything. A run may
  also report `coveredSourceFiles`, every file it executed, so deleting a file's
  last scenario removes it rather than leaving it in the docs for good.

  Retirement also needs the file to have spoken for itself. A test that failed
  before `story.init()` ran — a throwing `beforeAll`, an import error, a timeout —
  is missing its scenario because the run broke, not because anyone deleted it, so
  its file is reported as incomplete and keeps what it did not name. Adapters
  decide that per test rather than per file: one healthy story does not vouch for
  a broken sibling suite in the same file.

  ***

  Steps record how many assertions they made, and a claim nothing checked stops reading as proof

  A scenario could state "p99 stays under 50ms" and pass without ever checking it.
  Nothing in the report could tell that apart from a claim backed by a real
  assertion: both rendered the same tick, and only a person reading the prose
  beside the `expect()` calls could catch it.

  The evidence ladder already graded how credible a claim's proof is, climbing from
  a passing test up through coverage, mutation score and failing-first
  verification. Every rung above the bottom one needed external tooling. The
  cheapest signal of all, whether the test asserted anything, was missing, so a
  scenario with ten assertions and one with none both graded `weak`.

  Steps now carry `assertions`, the count attributable to that step. Jest, Vitest,
  Playwright and Ruby read their framework's own live assertion counter, so the
  count is observed with no change to how tests are written and no new API. Both
  step styles work: a wrapped step measures its own body, and a marker takes the
  assertions written after it, closed off at the end of the test.

  Only the steps that state the claim are counted. Asserting that the setup worked
  says nothing about the outcome, and auto-And erases which steps were written as
  `then()`, so the keyword is recovered by position.

  A scenario whose claim steps ran and asserted nothing now grades `none` rather
  than `weak`, and that floor sits above every other signal: a test that cannot
  fail proves nothing, whatever artifacts it attached. The generated docs mark the
  step `_(no assertion)_` in Markdown and a `No assertion` badge in HTML, and the CLI summary and
  `--json-summary` report how many scenarios asserted nothing.

  Go, Rust, pytest, JUnit 5, xUnit and Cypress have no assertion counter to read.
  There a claim counts only when the author uses the adapter's assertion wrapper—Go
  `s.Expect`, Rust `expect_step`, pytest/Cypress `story.expect`, JUnit 5
  `Story.expect`, or xUnit `Story.Expect`—which is a declaration rather than an observation. Where
  nothing can be observed the field is omitted: absent means "cannot observe" and
  is deliberately not `0`, so the grading floor never fires on a language that
  simply cannot count, and claim totals are reported over the observable subset
  instead of a fabricated zero.

  This raises the floor, it does not verify meaning. `expect(x).toBeDefined()`
  under "p99 stays under 50ms" still counts as asserted. Checking that an assertion
  matches the sentence beside it is not decidable, and the report says "1 assertion
  observed" rather than "verified" for that reason.

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
