---
"executable-stories-formatters": patch
---

JUnit 5: the run says which classes it reached, and which it can speak for

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
