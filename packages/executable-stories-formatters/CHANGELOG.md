# executable-stories-formatters

## 1.16.1

### Patch Changes

- c535490: JUnit 5: the run says which classes it reached, and which it can speak for

  Runs report `coveredSourceFiles`, every test class the listener saw execute, so a
  `full`-scope run can retire a scenario its class no longer names. A successfully
  executed container counts as reached, so a `@TestFactory` that produced no tests
  still names its class, and a run whose classes told no story at all is still
  written — those are the runs the inventory is for.

  Anything that failed or was skipped goes to `incompleteSourceFiles`, so a class
  keeps what it last documented until a run can account for it in full. That covers a
  `@TestFactory` or a `@Disabled` test inside an otherwise successful class, which the
  JUnit Platform reports as successful either way.

  Runs carry `gitSha` too, from CI first and `git rev-parse` otherwise, so a report
  states the commit it describes. The lookup is bounded by its timeout, and the xUnit
  adapter resolves its own the same way. `.executable-stories/raw-run.json` is renamed
  into place, so a watch task reading it while a run finishes sees a whole document.
  `Story.video(path, caption?, poster?)` completes the doc-entry surface against the
  raw-run schema.

  The JUnit 5 reference and the `junit5-story-api` skill cover feature declarations,
  planned scenarios, video, embedded HTML, and the signatures for `Story.attachInline`,
  `Story.attachSpans`, `startTimer`/`endTimer`, `Story.fn` and `Story.expect`, under the
  `dev.executablestories.junit5` package. Prerequisites read Java 21 and JUnit Platform
  1.12, and the example is described as the Gradle project it is. `verify:junit5`
  asserts the covered-class inventory and a plan's source key.

- 9e8e515: pytest: reports keyed to the project, and a run that says what it reached

  Source paths in the run are relative to pytest's root directory, so the report a
  file owns under `reports/by-file/` keeps its identity across machines and CI. A
  test is keyed to the file it was collected from, so an inherited test method
  belongs to the subclass that ran it.

  Runs report `coveredSourceFiles`, every file a test ran in, so a `full`-scope run
  can retire a scenario its file no longer names — and a run whose files told no
  story at all is written, because that is the run the inventory is for. Files the
  run cannot speak for go to `incompleteSourceFiles`: a skipped test, a broken
  fixture or teardown, a module that failed to import, or a test that failed before
  `story.init`. Each keeps what it last documented until a run can account for it
  in full.

  `runScope` recognises every way pytest narrows a run: `-k`, `-m`, `--deselect`,
  `--last-failed`, a `file.py::test` node id, and a run that ended early through
  `-x`, `--maxfail`, Ctrl-C, or an internal or usage error. Runs carry `gitSha` —
  from CI first, `git rev-parse` otherwise, bounded by its timeout — and
  `packageVersion`, so a report states the commit it describes and what produced
  it. A relative `EXECUTABLE_STORIES_OUTPUT` resolves against the project root, and
  the run file is renamed into place, so a watch task reading it while a run
  finishes sees a whole document. `story.video(path, caption=None, poster=None)`
  completes the doc-entry surface against the raw-run schema.

  The pytest reference and the `pytest-story-api` skill cover feature declarations,
  planned scenarios, screenshots and video, embedded HTML, the run-inventory
  fields, and the signatures for `attach_spans`, `start_timer`/`end_timer`,
  `story.fn` and `story.expect`, under the `executable_stories` import name.
  Prerequisites read Python 3.12 and pytest 8. `verify:pytest` asserts the
  covered-file inventory, its project-relative paths and the commit sha, and the
  package's ruff and mypy gates run in CI.

- 7b063d6: Rust: a run that says when it ran and what produced it

  Runs carry `startedAtMs` and `finishedAtMs`, which is what stamps a scenario's
  freshness in the report, alongside `gitSha` — from CI first, `git rev-parse`
  otherwise, bounded by its timeout — and `packageVersion`, so a report states the
  commit it describes and what produced it. `runScope` reads `--ignored` as a
  narrowed run, since it runs only the tests an ordinary run leaves out.

  A relative `EXECUTABLE_STORIES_OUTPUT` resolves against the project root. Each
  run goes to a scratch file of its own and is renamed over the destination, so a
  watch task reading it mid-run sees a whole document and concurrent writers stay
  out of each other's way. `StepDoc::video(path, caption, poster)` completes the
  doc-entry surface against the raw-run schema.

  The Rust reference and the `rust-story-api` skill cover feature declarations,
  planned scenarios, video, embedded HTML, the provenance fields, and the
  signatures for `with_ticket_url`, `attach_inline`, `attach_spans`,
  `start_timer`/`end_timer`, `fn_step`, `expect_step` and `assert_that`, against
  Rust 1.85 and edition 2024. `verify:rust` asserts each file's declaration and
  the run's provenance, and rustfmt, clippy and a build on the declared minimum
  toolchain run in CI.

  Two new skills: `show-me` answers a question with the smallest view that makes
  the point, reaching for the run before drawing anything; `demo-video` builds a
  narrated walkthrough from a run's storyboard frames.

- c24e579: xUnit: the run file lands in your project, and the report carries more of the run

  `dotnet test` runs the test host out of `bin/<config>/<tfm>`. The xUnit adapter
  now resolves the project directory from the test assembly, so
  `.executable-stories/raw-run.json` sits beside your test project and `projectRoot`
  names the directory the report's relative paths are meant to resolve against. A
  relative `EXECUTABLE_STORIES_OUTPUT` anchors to the same place, and
  `EXECUTABLE_STORIES_PROJECT_ROOT` sets it outright for a layout that puts build
  output elsewhere. The file is renamed into place, so a watch task reading it while
  a run finishes always sees a whole document.

  Runs now report `coveredSourceFiles`, every test class the recording attribute
  saw, so a class emptied of scenarios is distinguishable from one the run never
  reached and a `full`-scope run can retire what it no longer names. That holds for
  a run whose classes told no story at all, which is the case the inventory exists
  for. Runs also carry `gitSha`, resolved from CI first and `git rev-parse`
  otherwise, so a report states the commit it describes.

  `Story.Planned` keys a plan to its own class — through xUnit's test context, so it
  holds when the plan is declared after an `await` — and it groups with that class's
  scenarios and its feature declaration. `Story.Video(path, caption?, poster?)`
  completes the doc-entry surface against the raw-run schema.

  The xUnit reference and the `xunit-story-api` skill now cover feature
  declarations, planned scenarios, video, and the real signatures for attachments,
  timing, `Story.Fn` and `Story.Expect`; prerequisites read .NET 10 and xUnit v3
  throughout. `verify:xunit` exercises the default output path and asserts the
  covered-class inventory and a plan's source key.

## 1.16.0

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

### Patch Changes

- Updated dependencies [4fdd651]
  - executable-stories-core@0.24.0
  - executable-stories-react@0.15.0

## 1.15.0

### Minor Changes

- d8681d2: Reports and worklists now answer the questions people arrive with.

  Search matches ticket ids, error text and source paths alongside titles, tags and steps. A red run offers every failure as one agent prompt from the failure banner. Returning readers get a "since your last visit" line covering what changed while they were away, kept in their own browser. Run details names the five slowest scenarios, and `check --max-duration` turns that into a CI budget. `triage --by-owner` groups the worklist by `CODEOWNERS`, routing each failure to the team that owns the code it covers.

### Patch Changes

- Updated dependencies [d8681d2]
  - executable-stories-core@0.23.0
  - executable-stories-react@0.14.0

## 1.14.0

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

### Patch Changes

- 5754182: Report scenarios in source order when tests run in parallel

  `sortScenarios: "source"` ordered by `story.sourceOrder`, a counter incremented on
  each `story.init()` call — execution order, not source order. Under parallel
  workers each worker restarts it at zero, so a suite came out shuffled and could
  reorder itself when a worker was added.

  Ordering now uses `sourceLine`, which adapters already record from the framework's
  own location for each test. Markdown and Confluence share one comparator.
  Single-worker runs are unchanged.

- Updated dependencies [96b5a37]
  - executable-stories-core@0.22.0
  - executable-stories-react@0.13.0

## 1.13.0

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

### Patch Changes

- Updated dependencies [945b27e]
  - executable-stories-core@0.21.0
  - executable-stories-react@0.12.0

## 1.12.0

### Minor Changes

- c8fe24a: Let a file declare what its scenarios are for, take any framework's results, and stop losing switched-off scenarios in a count

  **A file can say why its feature exists.** A scenario says what the system does; nothing said who it serves. `story.feature(...)`, in all eleven adapters, declares a title, a kind (`feature`, `ability`, or `business-need`), a markdown narrative, and a glossary, and the report opens with that before the examples. Files that declare nothing render exactly as they did. Tags on a declaration now reach every scenario in its file, which is what they were documented to do and the reason to write one on the declaration rather than on each scenario. Go and Rust scenarios record the file they were written in, so a declaration made in `init()` or through `declare_feature!` reaches them instead of leaving every scenario under "unknown". Playwright keys declarations on the declaring file: a worker reused across specs used to hand one file's feature to the next, and the reporter recorded it against a file that never wrote one.

  **Less per-test ceremony in three adapters.** Rust required `story.pass()` in every passing test; a story dropped without it recorded a failure, so a forgotten call turned a green test red in the docs only. Status now comes from whether the thread is unwinding. `#[test]` functions returning `Result` are the one case that cannot be detected, since returning `Err` never panics: pass the fallible call through `story.record_result(...)` or call `story.fail()`. Ruby required `story.record(status: "pass", ...)` after the assertions, which a failing test never reached, so failures were the one thing the report could not show; `require "executable_stories/minitest"` now hooks `after_teardown`. xUnit required `Story.RecordAndClear()` per test wrapped in try/catch, and one `[assembly: StoryRecording]` now covers a whole test project.

  **`push` takes any framework's results.** It already took a StoryReport or a raw run, and now also takes JUnit XML, Playwright's JSON reporter, and an allure-results directory, which the cloud converts at the edge. The format is detected from what you point at rather than selected by subcommand, and `--format story|junit|playwright|allure` overrides when detection guesses wrong; a declared `schemaVersion` always wins, so a StoryReport is never mistaken for something else. Foreign formats upload verbatim so the conversion rules live in one place instead of drifting between the server and every version of this CLI in the wild. An allure-results directory is read the way Allure writes it, and change metadata is capped to fit in a request URL so a large PR cannot lose its run to a 414.

  **`--force` keeps a blinking endpoint out of your build.** A CI job that goes red because the reporting endpoint blinked teaches people to stop reporting. It covers the wire, never the verdict: `--gate` still runs after a forced failure and still exits 5 on a blocked release, because a release blocked against a commit was blocked before the push and is not un-blocked by the push failing to land.

  **`check` names switched-off scenarios instead of counting them.** A run could stop validating forty specs and still print `All scenarios green.` under a `40 skipped` count, which is how a turned-off spec gets forgotten. Each one is now listed with its location and its ticket, or `no ticket`, and such a run reads `All running scenarios green.` Planned (`it.todo`) scenarios are a spec waiting for code rather than one you stopped validating, so they stay out of that list. `--max-skipped <n>` puts a budget on it and exits 5 when it is exceeded — worth setting to 0 in an agent loop, where making a scenario skip is the cheapest way out of a red run.

  **Explorer filters live in the URL.** `?q`, `?status`, and `?tag` are read on load and written back as you filter, so `/explorer/?tag=capability:checkout` is an address a ticket can hold. Link by tag rather than at one scenario's page: specifications get renamed, moved, split, and merged as the domain model changes, and a tag survives all four. A tag with nothing behind it renders empty, so a link that has gone stale says so instead of quietly reading as green.

  **The formatters package is lint clean and has a `lint` script**, so `pnpm quality` covers it. Most of the 64 accumulated errors were dead weight, but `build-gherkin-document` computed a resolved keyword type for And/But steps and then emitted the raw one, so the inheritance that block was written for never applied; the AST is right to keep `Conjunction` there and `resolvePickleStepTypes` already does the inheritance where it belongs. Modules that were only named `index.ts` now have names that say what they are — `report-generator.ts`, `compare/diff-runs.ts`, `deploy/deployments.ts`, `notifiers/send-notifications.ts`, `sync/adapters/registry.ts`, `formatters/cucumber-messages/formatter.ts` — with `index.ts` re-exporting them, so nothing changes for anyone importing the package. For core, `canonicalizeRun` moves into the new `converters/acl/canonicalize` subpath, and `converters/acl/index` still re-exports it.

### Patch Changes

- Updated dependencies [c8fe24a]
  - executable-stories-core@0.20.0
  - executable-stories-react@0.11.0

## 1.11.0

### Minor Changes

- 57e9ea1: `push` reads the ingest endpoint's answer instead of discarding it, and can
  block on the release gate.

  Ingest returns the run's URL and the scope the change implies; `push` printed
  only the run id, so both died on the wire and the CI log said nothing useful.
  It now prints the URL and each recommended case with the reason it was picked.

  `push --gate` asks `GET /api/v1/releases/gate` whether the pushed commit is
  safe to release and exits 5 when it is blocked, naming every blocking reason.
  The policy lives in the organization's settings rather than a file in the
  repo, which is the point: manual results, evidence requirements, and eval
  thresholds are not things a repository can hold on its own. A commit with no
  release recorded against it exits 0 — CI asking early is normal, and a verdict
  invented from no evidence is worse than saying there is nothing to gate on.
  An unreachable or erroring gate fails the build rather than passing it.

  `push` now reads the GitHub Actions environment: repo, branch, and SHA from
  the standard variables; the base commit and PR number from the event payload,
  fetching that commit when a depth-1 checkout has not got it; the run URL and
  recommended scope written to `GITHUB_STEP_SUMMARY`; the run id appended to
  `GITHUB_OUTPUT` as `ingest-run-id`, before the gate runs, so a blocked release
  still reports where the run landed. No flags are needed for any of it, and it
  works in a hand-rolled workflow rather than only through our Action — which
  now shells out to `push` instead of carrying its own copy of the wire
  contract.

  The payload's `source` is `local`, or `action` under GitHub Actions. It was
  `serve`, which named a subcommand removed some releases ago. The endpoint
  accepts all three.

## 1.10.0

### Minor Changes

- 01df811: Add test-management sync, and make `check-links` check the links it was silently skipping.

  ## `coverage` and `sync`

  `executable-stories coverage <provider> <run.json>` is read-only. It reports how many cases in a test-management system your stories already cover, which manual cases duplicate an automated story, and which stories have no case. Output goes to stdout, JSON, and Markdown.

  `executable-stories sync <provider> <run.json>` authors case bodies from stories, records executions against them, and attaches screenshots and video as evidence. Dry run by default; `--apply` writes.

  Safety rules the engine enforces for every provider: a case edited by a human is skipped rather than overwritten (drift is detected by hashing the provider's own normalized copy), a hand-authored case reached through `story.tickets` never has its body touched, deleted stories orphan their case rather than removing it, and similarity never creates a binding.

  A provider that will not hand back a case body cannot be drift-checked at all, so the engine falls back to the hash it stored on the last write — enough to keep an unchanged body out of the plan — and reports the count it could not verify rather than implying a guarantee it is not making.

  Bindings live in a committed `.executable-stories/sync.lock.json`, keyed on a content fingerprint so renaming a test or moving its file keeps the binding.

  Adding a provider is one adapter file plus one registry line: `listCases`, `createCase`, `updateCase`, and `recordResults`, with everything but `listCases` optional.

  `sync` and `coverage` are in the shell completion scripts, including the provider positional, and `--apply`, `--attach`, and `--report-url` complete as flags.

  First-run failures name their fix. The dry-run plan pointed at "run without --dry-run", which is not a flag this CLI has; it now says `--apply`. TestRail's client parses the response before branching on the status code, so a `url` pointing at a page rather than the instance root (a login page returned with a 200) names the setting to fix instead of surfacing `Unexpected token '<'` from deep inside the success path. A 401 says the credential is an API key from My Settings, not a password, and a 403 says an admin enables the API under Site Settings. Xray's authentication failure says its key pair comes from Apps -> Xray -> API Keys and that a Jira API token is a different credential.

  ## Config

  `loadConfig` previously projected only `formatters`; it now carries `sync` too.

  Config can also be `executable-stories.config.json`, auto-discovered alongside the existing `.mjs` and `.js`. The Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters all emit the same raw run and reach the same prebuilt binary, so a repo with no JavaScript in it can configure `sync` without authoring an ESM module. JSON carries `sync` but not `formatters`, which are functions.

  ## `check-links`

  Root-relative links (`/guides/x/`) were skipped outright, and they are the form a static-site generator actually needs: Astro serves `reference/foo.md` at `/reference/foo/`, so a relative link in the body resolves against the page URL rather than the file path. The checker resolves them against a site root, defaulting to the scan target, with `--site-root` to override.

  Assets served at the site root resolve too. `check-links` walks up from the scan target for an `astro.config.*` beside a `public/`, so `/screenshots/hero.png` verifies with no configuration; `--assets <dir>` sets it explicitly for other layouts.

  Attribute links are matched on their own instead of being anchored to a lowercase tag name. MDX pages hand links to components (`<ReportScreenshot src="..." />`), and the old pattern skipped the uppercase name and stopped at the first attribute per tag, so those went unchecked.

  Anchors and query strings are stripped before a link names a file, and a bare `/` no longer reports as broken.

  Together these turned up 231 genuinely broken links in this repo's own docs site, all now fixed. `apps/docs-site` runs `check-links` as its `test` script so they stay fixed.

  ## Flakiness counts

  `calculateFlakiness` zeroed `failureRate` and both streaks below the sample threshold. The threshold gates the _classification_ only — two runs cannot tell you a scenario is flaky — but the counts are plain arithmetic and stay honest at any sample size. Reporting `failureRate: 0` for a scenario that has only ever failed was worse than reporting nothing.

## 1.9.2

### Patch Changes

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

- Updated dependencies [6ce9ac2]
  - executable-stories-core@0.19.0
  - executable-stories-react@0.10.1

## 1.9.1

### Patch Changes

- Updated dependencies [4c1cd51]
  - executable-stories-react@0.10.0

## 1.9.0

### Minor Changes

- 075d71e: Partial-run compares, view state in the URL, and visible mermaid failures

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

### Patch Changes

- Updated dependencies [075d71e]
  - executable-stories-react@0.9.0

## 1.8.0

### Minor Changes

- 50b564a: `push --base <ref>` sends the files changed since `<ref>` so Executable Stories Cloud can recommend a change-aware test scope. Best effort: a failed diff pushes the run without change metadata.
- 73f486c: New `push` subcommand: send a run (StoryReport v1 or raw run JSON) to Executable Stories Cloud without a custom curl script. Accepts `--key`/`EXECUTABLE_STORIES_API_KEY`, `--url`/`EXECUTABLE_STORIES_URL`, and infers `--repo`/`--branch`/`--git-sha` from git. Raw runs are converted through the standard synthesize → canonicalize → StoryReport pipeline before upload.

## 1.7.0

### Minor Changes

- a0aeaf6: State snapshots, persona-lens follow-ups, and an LLM-paste output format.

  **New `state` doc kind** — `story.state({ label?, value })` captures what the world looks like at a step as a JSON-serializable snapshot (e.g. the Basket after adding an item). Storyboards are no longer screenshot-only: a step carrying a screenshot or state docs becomes a filmstrip frame, consecutive same-label snapshots render as diffs derived at render time (`items[0].qty: 1 → 2`), and multiple labels appear as side-by-side lanes. Journey pages show each chapter's final state card, and `/states` gives non-UI scenarios data-card thumbnails. HTML and Astro render diff-first cards, Markdown shows compact diff summaries with a collapsed snapshot, and story-report-json/MCP carry the entries via the schema; JS adapters warn above ~100KB per snapshot.

  **Design context strip** (`executable-stories-astro`) — `story.link()` docs pointing at a design tool (Figma, Zeplin, Sketch) or labelled "Design ..." now render as a **Design** strip at the top of story pages and journey pages, so designers land on the mockup next to the proof. Pure presentation over existing docs, no new story API. New exports: `designLinks()`, `isDesignLink()`, `<DesignContext/>`.

  **Journey run history** (`executable-stories-astro`) — point the config's new `historyFile` at the store the CLI's `--history-file` maintains and journey pages show a journey-level badge ("7/10 recent runs passed · flaky"), aggregated from the member scenarios' histories: a journey fails a run when ANY member failed it. Same status-transition flakiness classification as the CLI and report island. New exports: `journeyRunHistory()`, `aggregateJourneyHistory()`, `readHistoryStore()`.

  **Environment drift page** (`executable-stories-astro`) — sites with two or more `sources` (staging vs production, one run per repo in a docs hub) get a `/drift` page: every scenario's status per source side by side, mismatches floated to the top, including scenarios absent from one source. Injected automatically with ≥2 sources; `injectDrift`/`driftBase` override. New exports: `extractDrift()`, `driftEnabled()`.

  **Evidence grade in the traceability CSV** (`executable-stories-formatters`) — `traceability-csv` gains an `evidence_grade` column: the same weak → strong grading the Evidence Review applies (screenshot, OTEL trace, mutation score, failing-first verification), so the auditor spreadsheet says not just "passed" but how credible the proof is.

  **Regression storyboards in `compare`** (`executable-stories-formatters`) — the run-diff HTML report now renders a step-screenshot filmstrip on every scenario whose status flipped (regressed or fixed), so triage starts from what the product looked like, not a stack trace. Frames come from the same step-attached screenshots the report filmstrip uses.

  **New `agent-text` output format** (`executable-stories-formatters`) — the full run (steps, doc entries, errors) as flat, token-lean plain text for pasting into an LLM. Same content as the Markdown report minus everything a model never reads (ids, hashes, durations, source lines, JSON punctuation), with a self-describing header so the model knows how to read the block. ~12x smaller than the HTML report on a real 74-scenario run. Added to the `agent` preset; writes `<name>.agent.txt`.

### Patch Changes

- Updated dependencies [a0aeaf6]
  - executable-stories-react@0.8.0

## 1.6.0

### Minor Changes

- 28ea159: Stakeholder living docs: visual storyboards and persona views.

  **Visual storyboards** — scenarios whose steps carry screenshots (e.g. Playwright `story.screenshot({ page, alt })` after each step) now render a horizontal filmstrip — Given → When → Then, each frame a thumbnail linking to its step — above the step list in the HTML report and on Astro story pages. Derived, not authored: `extractStoryboardFrames()` (new in `executable-stories-core/storyboard`) reads the step docs the tests already emit, and the new `<ReportStoryboard/>` component renders them. Appears automatically from 2 frames up; hydration-free, so it works in static Astro islands.

  **Persona views** — `views: [{ base: '/for/product', include: { tags: ['audience:stakeholder'] }, groupBy: 'tag' }]` in `defineExecutableStories()` mounts filtered, re-grouped indexes at their own URLs, one per audience (product, design, support, QA). Each renders the same interactive index as `/stories` through its lens, appears in the sidebar under "Audiences" via `storiesSidebar()`, and explains itself when its tags match nothing yet. New exports: `resolveViews`, `matchView`, `viewReport`, `PersonaView`.

  **Journeys** — tag scenarios `journey:<id>[:<order>]` and each id becomes an ordered multi-scenario walkthrough at `/journeys/<id>` (configurable via `journeysBase`/`injectJourneys`): member scenarios in tag order as full cards — storyboards included — under one aggregate status (`failed` if any member failed, `passed` only when all passed). A tag convention, not a new API, so it works in every adapter today. `extractJourneys()`/`parseJourneyTag()` are new in `executable-stories-core`; embed a journey in MDX with `<StoryJourney id="..."/>`.

  **UI-state catalog** — `state:<name>` tags feed `/states` (configurable via `statesBase`/`injectStates`): a thumbnail grid of the UI states the product verifiably has, each card a scenario's first storyboard frame linking to its story page, with `viewport:mobile`/`viewport:desktop` variants side by side within their state.

  **Traceability CSV** — new `traceability-csv` output format in `executable-stories-formatters`: the traceability matrix as flat RFC-4180 CSV for auditors and spreadsheets, one row per requirement-scenario pair plus a row per untraced scenario. Same derivation as `traceability-matrix`, so the two can never disagree.

### Patch Changes

- Updated dependencies [28ea159]
  - executable-stories-react@0.7.0

## 1.5.0

### Minor Changes

- ff9dfe1: Astro artifact UX, CLI parity for non-JS adapters, and report triage defaults

  **Astro: embeddable scenarios and agent-readable endpoints.**
  - New `<StoryScenario/>` (full scenario card: steps, status, failure output, docs) and `<StoryStatus/>` (inline linked status pill) let hand-written MDX embed live scenarios. Both resolve by stable scenario id, URL slug, or exact title, and show a visible callout when the reference stops matching, so embedded evidence never silently disappears.
  - `agentEndpoints` (default on) injects `/llms.txt` (an llms.txt-format index of every scenario) and a plain-Markdown twin of each story page at `<routeBase>/<slug>.md`. A published site is now consumable by agents and `curl`, not only browsers, and static builds prerender them as real files.
  - The report-island pre-bundle (`optimizeDeps.include`) and React dedupe now ship inside `executableStories()`, so the "Outdated Optimize Dep" fix arrives with `pnpm update executable-stories-astro`. Scaffolds no longer carry a `vite` block.
  - The integration watches a nav-manifest that the loader rewrites whenever a run changes the feature/scenario tree, so the Starlight sidebar stays fresh in dev. Status-only changes keep hot-reloading.

  **One scenario-to-Markdown serializer.** `scenarioToMarkdown` lives in `executable-stories-core` and backs both the HTML report's "Copy as Markdown" button and the Astro `<slug>.md` endpoints, so a scenario copies the same either way. `variant: "compact"` renders the paste-sized excerpt; the default renders the standalone document.

  **Non-JS adapters reach the CLI with less friction.**
  - `format` (and the other file-taking commands) resolve `.executable-stories/raw-run.json`, then `reports/raw-run.json`, when given no path, and print the resolved path to stderr.
  - New `executable-stories doctor` diagnoses the run JSON: where it is, whether it parses, its `schemaVersion` against what the CLI supports, and what it contains. It names cross-language drift ("your adapter is newer than the CLI") plainly instead of surfacing it as a deep validation error.
  - Each of these adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) emits a `$schema` pointer as the first key so editors validate the file as it is written, and prints the exact next command after writing (silence with `EXECUTABLE_STORIES_QUIET`). The JS/TS reporters render in-process, so they keep writing plain run JSON.

  **CLI ergonomics.**
  - `--preset agent|ci|docs` expands to a format bundle, and unions with `--format` when both are passed.
  - `--open` opens the generated HTML report.
  - `format` prints a one-line summary (`✔ 12 scenarios (11 passed, 1 failed) → reports/index.html in 84ms`) instead of finishing silently.
  - `executable-stories completion bash|zsh|fish`.
  - Colocated output writes an `index.html` that links every per-file report, failures first. It skips that index (with a warning) when a report already occupies `index.html`, so it never overwrites an aggregate report of that name.

  **Report opens as a triage surface.** A run with failures collapses passing work to its titles, expands failures, and floats features that contain failures to the top. All-green runs are unchanged, and a saved collapse preference always wins, so this only seeds a first visit.

  **Fixes** the scaffolded sample run JSON, which used `schemaVersion: "1.0"` (a string) where the schema requires the integer `1`. The Astro loader tolerated it but `executable-stories format` rejected it.

### Patch Changes

- Updated dependencies [ff9dfe1]
  - executable-stories-react@0.6.0

## 1.4.0

### Minor Changes

- feada36: Code Diff evidence for the Evidence Review report. A unified patch (`git diff --histogram`) plus an annotation sidecar enter at the CLI layer (`review --patch --code-diff`), never through adapters. Annotations are content-anchored (hashed changed lines + context window, patch(1)-style fuzzy relocation) and resolve to anchored, ambiguous, or orphaned — never silently reattached. Each annotation cites scenario IDs, rendered as status deep links into the review; missing scenarios show as unverified references and hunks without scenarios as "not covered". The review HTML renders a hand-rolled escaped unified-diff viewer (no diff library, no island cost) with the raw patch available on demand; Markdown gets a static fallback. `--strict-code-diff` gates CI on orphaned anchors or unverified references. New exports: `parseUnifiedDiff`, `createAnchor`, `relocateAnchor`, `assembleCodeDiff`, and the Code Diff review types.

## 1.3.0

### Minor Changes

- a536e42: Redesign the HTML report UI on shadcn/Base UI components.
  - Typography and tokens: switch the report to Geist + Geist Mono and a larger corner radius, applied across the standalone report, the React island, and the shared `--es-*` theme contract.
  - Summary: flat neutral KPI cards with a monospace label, a status dot, and an oversized tabular number coloured by status, replacing the tinted pastel cards.
  - Header: the theme control moves to the top-right beside search; "Expand all" and "Show documentation" become Base UI switches; status and tag filters sit above the view controls, separated by a divider.
  - Status hierarchy: passed, skipped, and pending badges are quiet outlines, and the passing pill is dropped entirely (the check glyph and title carry it, with an sr-only status for screen readers). Only a failure keeps a filled badge, so a broken run stands out.
  - Tags: the filter list collapses to one row behind a "+N more" toggle on tag-heavy reports, and selecting a tag no longer reflows its neighbours.
  - New Base UI `Switch` primitive; the keyboard-shortcuts dialog is rebuilt on an aligned grid with a corrected `aria-keyshortcuts`.
  - Astro embed: feature and scenario navigation folds into the Starlight sidebar and the report renders full-width.
  - Astro packaging: `executable-stories-react` moves from a required peer dependency to a direct dependency, so consumers no longer install it separately, and the package version realigns to the 7.x line to track the supported Astro major.

### Patch Changes

- Updated dependencies [a536e42]
  - executable-stories-react@0.5.0

## 1.2.1

### Patch Changes

- 393b095: Relicense from MIT to Apache-2.0.

  All packages are now published under the Apache License, Version 2.0, and
  every package tarball ships its own LICENSE file. Several packages
  (`executable-stories-astro`, `-cypress`, `-demo`, `-jest`, `-playwright`)
  previously published with no `license` field at all; that is fixed.

  Versions published before this change remain available under MIT. The
  Executable Stories name and logo are trademarks and are not granted by the
  code licence — see TRADEMARKS.md in the repository.

- Updated dependencies [393b095]
  - executable-stories-react@0.4.1

## 1.2.0

### Minor Changes

- af026d1: Explainer contract v1 + typography-grade markdown rendering.

  Explainers (output of the new `explain-change` skill) are markdown docs whose
  frontmatter carries a machine-readable provenance block citing scenarios by id,
  title, and content hash (hash is mandatory in v1 — id-only citations cannot
  detect drift and are rejected as invalid).
  - **core** (private, bundled into the packages above — no version bump of its
    own): new `executable-stories-core/explainer` module — `scenarioContentHash`
    (title + steps digest, status excluded), `checkExplainerRef` (fresh/changed/
    renamed/missing per citation), `explainerRefFromFrontmatter`.
  - **formatters**: new `check-explainers` subcommand audits a directory of
    explainers against a run (exit 5 when stale/invalid, `--no-fail` to report
    only); `explainer-v1.json` schema; scenario-index items now carry `hash` so
    agents can stamp frontmatter without inventing values.
  - **astro**: `authoredDocsLoader({ explainers: config })` injects a fresh/stale
    banner with story-page deep links into any doc carrying an `explainer` block;
    the init-astro template enables this by default.
  - **Astro-first onboarding**: `init-astro --install` scaffolds AND installs in
    one command (package manager detected from your lockfile), and `format`
    prints a one-line stderr tip pointing at `init-astro` on first contact with
    an output directory (when it writes the artifacts README) if no docs site
    exists yet — never on later runs, and never for `--json-summary` agent
    pipelines.
  - **DX**: the Vitest bootstrap template now uses the `createStoryReporter()`
    factory (no `createRequire`, no `as unknown as Reporter` cast) and the
    Playwright template uses the plain reporter module id; new
    `executable-stories dev` runs the docs site in one command
    (finds `./story-docs`, installs deps if missing, hands off to the dev
    server); `format` drops a write-once README into the output dir explaining
    each artifact; the CLI no longer misreads a docs-site
    `executable-stories.config.mjs` as plugin config.
  - **Rename**: the scenario-index artifact now matches its format and schema
    name — files are `*.scenario-index.json` (was `*.scenarios-index.json`) and
    the MCP HTTP route is `/scenario-index` (was `/scenarios-index`). Update any
    pipeline that globs the old name.
  - **react**: `story.section` markdown now renders through
    `@tailwindcss/typography` (`prose prose-sm`), with the prose palette mapped to
    the report theme tokens so it follows light/dark automatically.

### Patch Changes

- Updated dependencies [af026d1]
  - executable-stories-react@0.4.0

## 1.1.0

### Minor Changes

- fe8cd62: **Self-contained packaging (publish fix).** `executable-stories-core` is now an
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

### Patch Changes

- Updated dependencies [fe8cd62]
  - executable-stories-react@0.3.0

## 1.0.1

### Patch Changes

- b905ea9: Fix broken screenshots surfacing as raw `/home/runner/work/...` image links in
  PR comments and a bare, un-labeled broken `<img>` in HTML reports — plus a new
  `story.screenshot({ page, alt })` form that removes the root cause.
  - **executable-stories-playwright**: `story.screenshot({ path })` now warns
    (`console.warn`) at the call site when the file can't be read, instead of
    silently falling back to the raw path and only surfacing the problem minutes
    later as a broken image in CI. The far more common cause is a missing
    `page.screenshot({ path })` call, or a `path` that doesn't match — the
    warning names the exact path and suggests the fix.
    Add `story.screenshot({ page, alt })`: captures the screenshot itself from
    the in-memory buffer and inlines it as a `data:` URI directly, with no
    filesystem round-trip at all — so there's no path for the two calls to fall
    out of sync, and nothing for Playwright's per-test output cleanup to delete
    before the report is built. `path` is still accepted alongside `page` if you
    also want the file written to disk. The existing `{ path }`-only form still
    works unchanged for screenshots captured elsewhere.
    Inline step docs (`story.then(text, { screenshot: { path } })`) now inline
    existing files as `data:` URIs too, matching `story.screenshot()` — this
    path previously never embedded the file no matter how it was captured.
    `story.video()` also now warns when given an absolute path that doesn't
    exist yet — video bytes are never inlined (too large for a `data:` URI),
    so it had no equivalent signal at all before; a relative path (resolved
    later by the asset bundler) is unaffected.
  - **executable-stories-formatters**: the Markdown formatter no longer emits
    `![alt](path)` / `<source src="path">` for a screenshot or video whose path
    is a bare local filesystem path rather than a `data:`/`http(s):` URI or a
    bundler-resolvable relative path. `story.video()` never inlines (video
    bytes are too large) and only ever resolves through a downstream asset
    bundler, so an absolute path reaching Markdown means that step didn't run —
    most commonly because the Markdown was posted straight to a GitHub PR
    comment, with no bundling step in between. Embedding it verbatim guarantees
    a broken reference everywhere that Markdown is rendered. Both now render a
    plain "Screenshot/Video unavailable" note naming the path instead.
  - **executable-stories-react**: restore the "Screenshot unavailable" /
    "Video unavailable" placeholder for local-filesystem screenshot/video paths
    that the HTML report's asset bundler couldn't resolve — a regression from
    the React rendering rewrite where `DocScreenshot` rendered a bare `<img
src>` and `DocVideo` a bare `<video src>` with no fallback for either. Also
    route `DocScreenshot`'s `src` through the same scheme allow-list already
    used by `DocVideo`/`DocHtml` (`data:image/*`, `http(s):`, or relative only)
    instead of passing the report-supplied path straight into the DOM.

- Updated dependencies [b905ea9]
  - executable-stories-react@0.2.1

## 1.0.0

### Major Changes

- d7c4661: Make Astro a first-class way to view living docs.
  - **New package `executable-stories-astro`**: an Astro integration + Content Layer
    loader that turns the test run JSON into a hot-reloading `stories` collection,
    with injected routes for a stories index (`/stories`), per-scenario detail
    pages (`/stories/<slug>`), and a searchable Scenario Explorer (`/explorer`).
  - **BREAKING — `serve` removed**: the `serve` subcommand (a custom HTTP server)
    is removed in favour of the Astro dev server. Running `executable-stories serve`
    now prints a migration message. Scaffold with `init-astro`, run your tests in
    watch mode, and run `astro dev` to hot-reload the docs.
  - **BREAKING — `build-docs` removed**: the `build-docs` subcommand (a one-shot
    Markdown generator that wrote story pages into a scaffold) is removed — stories
    now render live from the run JSON via the `executable-stories-astro`
    integration, with no Markdown-generation step. `executable-stories build-docs`
    now prints the same migration message as `serve`. (`format --format
astro-markdown` still exists for one-off single-page exports.)
  - **`init-astro` reworked** to a thin scaffold (~8 user-owned files); the docs
    framework now ships inside `executable-stories-astro`. The scaffold is driven
    by a single `executable-stories.config.mjs` (sources, scenario selection,
    `groupBy` categorisation, authored docs, theme) imported by both
    `astro.config.mjs` and `src/content.config.ts`, with `storiesSidebar()`
    building the nav and `authoredDocsLoader` auto-titling plain markdown.

  **Migrating from the old `init-astro` scaffold** (the previous version copied
  ~30 framework files into your repo; they now ship in the package):
  1. Delete these directories if you did not customise them:
     `src/components`, `src/lib`, `src/pages/explorer`, `src/styles/themes`.
     (Keep anything of your own you added under them.)
  2. Add the dependency: `executable-stories-astro`.
  3. In `astro.config.mjs`: `import { executableStories } from "executable-stories-astro"`
     and add `executableStories({ source: "../reports/raw-run.json" })` to
     `integrations` (before `starlight()`).
  4. In `src/content.config.ts`: `import { storiesLoader } from "executable-stories-astro/loader"`
     and add `stories: defineCollection({ loader: storiesLoader({ source: "../reports/raw-run.json" }) })`.
  5. Remove any `build-docs` step that wrote story Markdown into `src/content/docs` —
     stories now render live at `/stories`.

### Minor Changes

- d7c4661: The HTML report is now rendered solely by executable-stories-react — the same renderer as the Astro docs site — and the in-package HTML string renderer is removed.
  - **`--format html`** now produces the standalone, interactive React report (search, status/tag filters, collapse, copy actions) — the single component tree shared with the docs site. The `--html-no-syntax-highlighting` / `--html-no-mermaid` flags are honoured; the report is self-contained (assets embedded), so `--asset-mode copy` is a no-op for it. Scenarios are ordered by source position.
  - **Removed**: the legacy HTML string renderer (`HtmlFormatter` / `HtmlOptions`), the 6 named HTML themes and the theme registry (`resolveTheme`, `HtmlTheme`, `getAvailableThemes`, `getCssOnlyThemes`), the `--html-theme` / `--html-theme-picker` CLI flags, the `executable-stories-formatters/render-doc` subpath export, and the interim `html-react` format name (use `html`). To render the report programmatically, use `renderReportToHtml` from `executable-stories-react/ssr`.
  - The Evidence Review HTML (`review-html`) and run-diff HTML (`run-diff-html`) reports are unchanged in output; they now carry their own design tokens (light/dark) instead of depending on the removed theme system, and no longer accept a `theme` option (their dark-mode toggle still works). The canonical `--es-*` theme tokens (`ES_THEME_TOKENS_CSS`) remain exported.

### Patch Changes

- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0
  - executable-stories-react@0.2.0

## 0.17.0

### Minor Changes

- 99072d1: Add `serve` subcommand for live docs in agent loops.

  `executable-stories serve <raw-run.json>` exposes a live docs URL that regenerates reports, triggers a browser reload, and shows "what changed since you started" on every run. It is built for loop-engineering / agent-loop workflows where a test watcher rewrites the raw-run file repeatedly: edit a test (or let a coding agent loop do it) and watch the behaviour catalogue update in realtime.

  Supports `--port` / `--host` and ensures the HTML surface is generated even when not explicitly requested. New `startServe` / `regenerateRun` and related helpers are exported for reuse.

## 0.16.0

### Minor Changes

- 31cce46: Add rename/move-resilient behaviour identity to the run diff.

  `diffRuns` now re-pairs id-unmatched scenarios whose content (steps + `covers`) is preserved across a title change or file move, classifying them as new `renamed` / `moved` change kinds instead of a false `removed` + `added`. Matching is conservative: an exact content fingerprint first, then a guarded fuzzy pass that only accepts a unique best match at or above 0.75 similarity — anything ambiguous stays add/remove.

  Because renames and moves no longer count toward `summary.added` / `summary.removed`, the release gate (`--fail-on-removal` / `--fail-on-new`) no longer fails a release on a pure test rename. New `behaviourFingerprint` / `behaviourSimilarity` helpers are exported for reuse.

## 0.15.1

### Patch Changes

- e3f8c5b: Harden the living-docs workflow and align adapter documentation with current APIs.
  - **`executable-stories-formatters`**: refuse `build-docs` when `--site-dir` is not a scaffolded Astro site (requires `astro.config.mjs`); share the same `isScaffoldedAstroSite` check with `init-astro --update`; ship `templates/` in the published package and restore `.gitignore` from the npm-safe `gitignore` template filename; clarify CLI help for the init-astro → test → build-docs flow and that `format --format astro` is a single-page primitive
  - **`executable-stories-jest`**: fix `setup` docs to reference `executable-stories-jest` reporter paths and modern `formats` / `outputDir` / `outputName` options
  - **`executable-stories-cypress`**: widen the Cypress peer dependency to `>=13.0.0`; document the `reporter.cjs` entry for Mocha reporter usage
  - **`executable-stories-playwright`**: clarify install instructions and that scenario modifiers should use Playwright's native `test.skip` / `test.only` / etc.
  - **`executable-stories-vitest`**: document the `covers` scenario option in the README
  - **`executable-stories-mcp`**: document the raw-run → StoryReport flow, MCP client registration snippet, and `get_deployment_status` / `get_environment_drift` tools

## 0.15.0

### Minor Changes

- 424b22c: Extend the Astro living-docs portal with stakeholder-safe commentary and clearer ownership of generated content.
  - add `executable-stories new scenario-note --scenario-id <id>` to scaffold per-scenario business context pages under `src/content/docs/notes/`
  - emit `public/stories/notes-index.json` from `build-docs` and surface matching Business context links in the Scenario Explorer and `/stories/` overview
  - render explicit unverified and stale states for hand-written pages via `verifiedBy`, `scenarioId`, and verification age warnings
  - ship the `init-astro` scaffold with a portal-oriented `.gitignore` that keeps generated `stories/` and `public/stories/*` output out of git by default while preserving human-authored docs

## 0.14.0

### Minor Changes

- 6374d1b: Extend the living-docs portal in `build-docs` with audience-aware navigation and baseline diff reporting.
  - **`--audience-split`** — partition story pages into `stories/engineer/` and `stories/stakeholder/` (opt-in; default layout is unchanged)
  - **`--baseline <story-report.json>`** — emit a what's-changed page (`stories/changes.md` + `public/stories/changes.json`) with added/removed/regressed/fixed/changed groups, and 🆕/✅/⚠️ badges on affected scenario pages
  - **Scenario deep-link index** — `public/stories/scenario-links.json` keyed by stable scenario id (`url`, `anchor`, `deepLink`, `audience`, `status`) for external tools and MCP
  - **Stories overview** — audience-first landing page at `/stories/` with pass/fail cards and deep links
  - **Markdown hooks** — `scenarioAnchor` and `scenarioBadge` options for in-page anchors and change markers

## 0.13.0

### Minor Changes

- e75d26f: Add agent-loop reporting primitives to `executable-stories-formatters`.

  This release adds the `check`, `goal`, and `triage` CLI commands for
  backpressure, definition-of-done, and failure worklist flows, plus a new
  `traceability-matrix` output format for requirement-first coverage reporting.
  It also fixes raw-run schema validation gaps so runs that include story
  `covers` metadata and step `stepId` fields validate correctly.

## 0.12.0

### Minor Changes

- 46c17b9: Add the `story.html({ path | url | content, title?, height? })` doc kind for embedding generated HTML (charts, single-file reports, and skill/agent output such as `teach` lessons or architecture reviews) directly in story reports. Exactly one of `path` / `url` / `content` is required.
  - **HTML report:** rendered inside an always-sandboxed `<iframe sandbox="allow-scripts">` (no `allow-same-origin`) with a title bar and an open-in-new-tab control. Embedded scripts run (Tailwind/Mermaid CDN charts work) but cannot reach the report DOM, cookies, or storage. Local files are inlined as `srcdoc` by default so the report stays self-contained; under `--asset-mode copy` they are copied as hashed assets. `height` accepts a number (px) or string (e.g. `"60vh"`), default 400px.
  - **Other formats degrade gracefully:** Markdown (link / collapsible code block), JUnit (text line), Cucumber JSON (`text/html` embedding), Confluence (link / code block).
  - **Adapters:** `story.html(...)` plus the inline `html` key on step docs across Vitest, Jest, Playwright, and Cypress. Playwright inlines local files at capture time so they survive per-test `outputDir` cleanup.
  - **Cross-language parity:** the Go, Ruby, Rust, pytest, JUnit 5, and xUnit adapters gain the same `html` doc kind (published via their own registries), each enforcing the exactly-one-source rule idiomatically.

  See the [Embedding skill & agent HTML output](https://github.com/jagreehal/executable-stories) guide for the sandbox-safe authoring contract and `content`-vs-`path` source guidance.

## 0.11.4

### Patch Changes

- bed366d: chore: update dependencies

  Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:
  - **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
  - **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
  - **executable-stories-mcp**: `zod` 4.0 → 4.4
  - **executable-stories-formatters**: `yaml` 2.8 → 2.9
  - Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

  Also migrated the workspace build/test tooling to **vite 8** (`vite: ^8` pnpm override; `@vitejs/plugin-react` 4 → 6). vitest 4.1.8 and storybook-vite 10.4.2 already support vite 8, and the astro example/docs apps build cleanly on it. `@types/estree` is pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` otherwise breaks the eslint-plugin type-checks).

  (Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node, vite — are not released as they don't affect consumers of the published packages.)

## 0.11.1

### Patch Changes

- c6890c9: Add release confidence workflows: gate-release CLI subcommand, deployment tracking (record/status/diff), ReleaseManifestFormatter, and new MCP tools for deployment status and environment drift.

## 0.11.0

### Minor Changes

- 00854ee: First-class video support and an expanded docs/agent toolchain.
  - **Adapters (Vitest, Jest, Playwright, Cypress):** add `story.video({ path, caption?, poster? })` doc kind and the `covers` story option (product-code paths/globs a scenario exercises). Playwright also auto-attaches its recorded run video.
  - **Formatters:** render the new `video` doc entry across HTML, Markdown, Confluence, and Astro outputs.
  - **Formatters CLI:** new `build-docs`, `check-links`, `watch`, `scaffold-doc`, and `import-openapi` commands.
  - **Formatters artifacts:** add the behavior-manifest JSON, scenario-index JSON, and coverage-index outputs alongside StoryReport v1.
  - **Astro template:** new Explorer page plus `HealthDashboard`, `VerifiedBy`, `VerifiedStep`, `ApiOperations`, `Checklist`, and `PageTitle` components, with verification/report-health helpers and global token styles.

## 0.10.0

### Minor Changes

- f790128: Add agent-oriented artifacts, an MCP server, and cross-language code→behavior linking.
  - **executable-stories-formatters:** Two output formats — `scenario-index-json` (Storybook-like scenario index, schema v1) and `behavior-manifest-json` (source-file rollups, tag index, doc coverage, debugger warnings). New scenario field **`covers`** (product-code paths/globs) carried through the StoryReport contract, plus `scenariosCoveringPaths` (code→scenario) and `diffStoryReports` (behavior diff) helpers. The behavior manifest gains a `missing-covers` debugger warning; `executable-stories list --list-format json` now includes `covers`. New **`watch`** subcommand (and `startWatch`/`regenerateArtifacts` API) regenerates agent artifacts whenever the raw-run file changes — a live, language-agnostic behavior index. The scaffolded **Scenario Explorer** gains code→scenario search (matches `covers` file paths) and shows covered paths per scenario.
  - **executable-stories-mcp:** New package. Read-only MCP tools over StoryReport v1 (`list_scenarios` with status/tag/source filters, `get_scenario`, `get_failing_scenarios`, `get_scenarios_for_paths`, `get_feature_summary`, `get_scenario_index`, `get_behavior_manifest`, `get_behavior_diff`) plus `run_scenario` (behind an extensible runner registry). Optional HTTP transport via `executable-stories-mcp/http`.
  - **executable-stories-{vitest,jest,playwright,cypress}:** New `covers` story option, beside `tags`/`tickets`, so code→scenario lookup works across frameworks. (Ruby, Go, Rust, pytest, JUnit5, and xUnit adapters gain the same `covers` field.)
  - **eslint plugins:** Documentation and metadata updates only.

## 0.9.0

### Minor Changes

- 203692c: Add Evidence-Driven Review — a report for reviewing AI-authored changes by behaviour and proof instead of by diff.
  - New `review` CLI subcommand: correlates a run against the PR diff (`--changed-files`, `--base-ref`) and bands changed code as 🔴 uncovered / 🟡 weak / 🟢 covered, with opt-in gates (`--fail-on`, `--min-evidence`).
  - `ReviewMarkdownFormatter` and `ReviewHtmlFormatter`: audience-segmented (stakeholder vs engineer, derived from file convention), evidence-graded claim cards with intent, tickets, and inline screenshots/OTEL.
  - New typed `evidence` field on `TestCaseResult` (mutation score, changed-line coverage, failing-first), ingested at the ACL layer — no adapter or story-API changes.
  - Fix: align `raw-run.schema.json` with what the official reporters emit (inline-body attachments, rich CI info) — previously a stale "MVP" shape that review-mode validation surfaced.

## 0.8.0

### Minor Changes

- 7f1f13d: HTML-first report improvements and Storybook coverage for every renderer.
  - Default output format is now `html` (was `cucumber-json`).
  - ✨ Copy-as-Claude-prompt button on failed scenarios — copies steps + error + source as a ready-to-paste prompt for AI investigation.
  - Persist collapse/expand state in localStorage so navigation across reloads keeps your context.
  - Mobile responsive refinements: header stacks, action buttons stay visible on touch, search input becomes full-width.
  - Storybook now covers every HTML renderer (doc-entries, scenario, steps, feature, error-box, failure-summary, tag-bar, toc, trace-view, meta, attachments, status, step-params), plus a `FullReport` composition and the `RunDiffHtml` formatter. Mermaid diagrams render live inside Storybook via the preview decorator.

## 0.7.15

### Patch Changes

- 6c87c1f: Multi-framework bootstrap and Cypress parity.
  - **executable-stories-cypress**: bring Cypress in line with Jest and Playwright. Adds top-level step exports (`given`, `when`, `then`, `and`, `but`), step modifiers (`.skip`, `.only`, `.todo`, `.fails`), scenario-level `story.skip` / `story.only`, `doc.story()` for attaching story metadata to plain Cypress tests, and a `traceUrlTemplate` option for linking failures to traces.
  - **executable-stories-init**: detect and scaffold Jest and Cypress alongside Vitest and Playwright. New `--jest`, `--cypress`, `--all`, and `--both` flags route through `resolveFrameworks()`; the wizard now prompts for all four frameworks. Plan generation batches dependency installs, handles script-name collisions when multiple frameworks coexist (e.g. `test:stories:vitest` + `test:stories:jest`), and emits framework-specific config and sample templates.
  - **executable-stories-formatters**: add `--fail-on-added-failures` and `--max-regressions` compare gates for CI regression budgets. Gate failures exit with code 5.

## 0.7.14

### Patch Changes

- e8ae8c1: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.

## 0.7.13

### Patch Changes

- 5273dbb: Propagate stable step IDs through the adapter → ACL → formatter pipeline so step results survive index reordering. Preserve original adapter `rawStatus` (e.g. `timeout`, `interrupted`) on `TestCaseResult` and surface it as a dedicated outcome tag in HTML and Markdown reports. Add a `visual` custom doc renderer (baseline/actual/diff) for HTML, Markdown, and Cucumber JSON. Add `story.observePageErrors()` to the Playwright adapter for snapshotting page runtime errors and console errors with an ignore list. Gate Playwright reporter diagnostics behind a new `debug` option.

## 0.7.12

### Patch Changes

- 73c8fa6: Fix broken screenshots, videos, and garbled error output in HTML reports
  generated on GitHub Actions and other CI runners.

  **Screenshots (`story.screenshot()`).** The path passed to `story.screenshot()`
  (typically `testInfo.outputPath(...)`) lives inside Playwright's per-test
  `test-results/` directory, which Playwright cleans up between runs. By the
  time the formatter (or a downstream artifact-only job) generated the HTML,
  those files were gone and reports shipped `<img src="/home/runner/work/...">`
  that 404'd against whatever host served the page. `story.screenshot()` now
  reads the file synchronously at the call site and inlines it as a `data:` URI,
  so the bytes are captured the moment they exist. Remote URLs and unreadable
  paths fall back to the original behavior.

  **Videos, traces, and auto-attachments.** Playwright videos and other
  path-based attachments hit the same cleanup race. The Playwright reporter now
  persists each path-based attachment at `onTestEnd`: files at or below
  `attachments.inlineMaxBytes` (default 1 MB) are base64-encoded into
  `raw-run.json`, larger files are copied to
  `<outputDir>/attachments/<test-id>/<filename>` and the path is rewritten to
  that stable location. Configurable via the new
  `StoryReporterOptions.attachments` field; pass `{ enabled: false }` for the
  previous behavior.

  **Error rendering.** Playwright supplies failure messages with embedded ANSI
  color codes (e.g. `\x1B[2mexpect(\x1B[22m...`). The reporter now strips ANSI
  from `error.message` and `error.stack` before they reach raw-run, and the HTML
  error-box renderer strips defensively as well so other adapters benefit.

  **Defensive HTML rendering.** When the formatter still cannot read a local
  absolute path at format time (POSIX `/foo` or Windows `C:\foo`), screenshots
  and attachments now render a "Screenshot/Attachment unavailable" placeholder
  showing the original path instead of emitting a broken `<img>`/`<video>` tag.
  Relative paths, remote URLs, and reports with `embedScreenshots: false` keep
  the legacy `<img>`/`<video>`/`<a>` output so users handling assets externally
  are unaffected.

## 0.7.11

### Patch Changes

- 4e99541: Fix 404s on screenshots when HTML reports are downloaded as CI artifacts.

  `story.screenshot({ path })` previously emitted the absolute on-runner path
  (e.g. `/home/runner/work/repo/test-results/foo.png`) directly as `<img src>`
  in the generated HTML. When the artifact was downloaded and opened locally,
  those paths no longer existed.

  The HTML formatter now inlines local screenshot files as `data:` URIs at
  render time when `embedScreenshots` is true (the default), making reports
  self-contained. Remote `http(s)`/`data:` URLs and missing files pass through
  unchanged. Disable per-report with `html: { embedScreenshots: false }`.

## 0.7.10

### Patch Changes

- 4f84253: Update dependencies. Align `@playwright/test` peer/dev versions across packages and example apps to `^1.59.1` to avoid loading two Playwright copies in the same process.

## 0.7.9

### Patch Changes

- 6778e30: Added Confluence Formatters

## 0.7.8

### Patch Changes

- e4953df: Added CSV + markdown-table list output

## 0.7.7

### Patch Changes

- f64a4f2: Added astro

## 0.7.6

### Patch Changes

- 650706c: Changed default page to index.html

## 0.7.5

### Patch Changes

- 0ec25fb: Add HTML report navigation enhancements, theme switching support, and Storybook examples for formatter UI review.

## 0.7.4

### Patch Changes

- 63b9b70: Updated deps

## 0.7.3

### Patch Changes

- d1bd61d: Repository `.gitignore` now allows `packages/**/bin/intent.js` to be tracked while other `**/bin/` paths stay ignored.

## 0.7.2

### Patch Changes

- 046fd1a: fix: use createRequire for StoryReporter in vitest configs to avoid Vite bundling @cucumber/html-formatter CJS code
  - Move executable-stories-formatters from peerDependencies to dependencies in all JS adapters
  - Fix "Dynamic require of fs is not supported" in all vitest.config.ts files
  - Remove skipped tests documenting unsupported features in jest, vitest, and playwright examples

## 0.7.1

### Patch Changes

- cda1ba6: Added story groupings

## 0.7.0

### Minor Changes

- 4a285ef: - **formatters:** Add `--html-theme` with six built-in themes (default, corporate, terminal, minimal, dashboard, playful). Add run-diff formatters (HTML and Markdown) for comparing baseline vs current runs, plus `diffRuns`, `listScenarios`, and `selectTestCases` APIs. Add failure-summary renderer in HTML report.
  - **playwright, vitest, jest:** Align story API and reporter output with formatters (themes, run-diff, scenario listing).

## 0.6.2

### Patch Changes

- dcf42c1: Add lint and type-check configuration across ESLint plugins and framework packages; align build/test tooling and add skills and quality checks for non-JS packages (Go, JUnit5, pytest, Rust, xunit).

## 0.6.1

### Patch Changes

- 43572f6: Updated tag html display

## 0.6.0

### Minor Changes

- 1dc53b3: - **ESLint plugins (Jest, Playwright, Vitest):** Use `context.sourceCode` instead of deprecated `context.getSourceCode()` for ESLint 9 compatibility.
  - **Dependency updates** across packages and example apps.

## 0.5.0

### Minor Changes

- 453d17d: **executable-stories-formatters**
  - **CI detection**: Auto-detect CI environment (GitHub Actions, GitLab, CircleCI, Azure DevOps, Buildkite, Jenkins, Travis) and attach branch, commit SHA, PR number, and build URL to reports.
  - **Notifications**: Slack and Microsoft Teams webhooks; generic webhook with optional HMAC-SHA256 signing. CLI flags `--slack-webhook`, `--teams-webhook`, `--notify` (always | on-failure | never), `--report-url`, `--webhook-url` / `--webhook-hmac-*`.
  - **History**: Optional run history via `--history-file` and `--max-history-runs`. Enables flakiness, stability grade, and performance trend metrics for the HTML report.
  - **HTML report**: CI meta block, history/stability/flakiness in scenario rendering, and updated styles.

  **executable-stories-playwright**
  - **OpenTelemetry**: Reporter can emit spans for story steps and scenarios when `autotel` is available (optional; lazy-loaded). Supports trace waterfall and framework-native observability.

  **executable-stories-vitest**
  - **Reporter**: Emit CI and run metadata so formatter CLI can attach CI info and history when generating reports.

## 0.4.0

### Minor Changes

- 68af01a: Add trace view to HTML reports: scenarios can display an OpenTelemetry-style trace waterfall when span data is attached. Formatters gain a trace-view renderer and OTEL types; Playwright and Vitest reporters pass trace/span data into the report.

## 0.3.0

### Minor Changes

- ab652d1: - **Repository metadata:** Add or fix repository metadata in each package for correct monorepo deployment (npm, changelog, docs links).
  - **OpenTelemetry:** Integrate OpenTelemetry support across adapter packages for trace links and observability.
  - **HTML report:** Step parameter highlighting — quoted strings and standalone numbers in step text are now visually highlighted in the HTML report for readability.
  - **Documentation:** Update READMEs and docs to describe HTML report features (step params, syntax highlighting, Mermaid, Markdown), fix formatters CLI flag docs (use `--html-no-*` disable flags; features are on by default), and add step parameter highlighting to the formatters API reference.

## 0.2.0

### Minor Changes

- bc9b2fe: ESLint config and plugins: minor updates for story-based API and conventions.
