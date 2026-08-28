---
"executable-stories-formatters": minor
"executable-stories-core": minor
"executable-stories-react": minor
"executable-stories-astro": minor
"executable-stories-vitest": minor
"executable-stories-cypress": minor
"executable-stories-playwright": minor
"executable-stories-jest": minor
---

Each test file owns its report, and combined views are derived

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

---

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
