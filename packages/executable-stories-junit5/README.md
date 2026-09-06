# executable-stories-junit5

JUnit 5 Kotlin adapter for executable-stories.

Provides a static Story API for framework-native JUnit 5 tests and emits raw story metadata for formatter pipelines.

## Install

> **Not yet published to Maven Central.** Until a release is published, consume the adapter from your local Maven repository.

Publish the adapter to Maven Local (from this package directory, using the bundled wrapper):

```bash
./gradlew publishToMavenLocal
```

Then add `mavenLocal()` and the coordinate to your consuming Gradle project:

```kotlin
// build.gradle.kts
repositories {
    mavenLocal()
    mavenCentral()
}

dependencies {
    testImplementation("io.github.jagreehal:executable-stories-junit5:0.1.0")
}
```

The coordinate is `io.github.jagreehal:executable-stories-junit5:0.1.0` (group, artifact, and version come from this package's `build.gradle.kts`).

## Usage

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class CalculatorTest {
    @Test
    fun addition() {
        Story.init("adds two numbers", "math")
        Story.given("two numbers 2 and 3")
        Story.`when`("I add them")
        Story.then("the result is 5")
        assertEquals(5, 2 + 3)
    }
}
```

## Features

- BDD steps: `given`, `when`, `then`, `and`, `but`
- Aliases: `arrange`, `act`, `assertThat`, `setup`, `context`, `execute`, `action`, `verify`
- Feature declarations: `Story.feature(title, kind, narrative, tags, glossary)` from a `@BeforeAll` says what a class's scenarios are for, ahead of the examples
- Planned scenarios: `Story.planned("...")` reaches the report as planned, under its own class, without disabling the test
- Rich docs via `Story.*` and `DocEntry.*`: `note`, `tag`, `kv`, `json`, `state`, `code`, `table`, `link`, `section`, `mermaid`, `screenshot`, `video`, `html`, `custom`
- State snapshots: `Story.state(value, label?)` records a JSON snapshot of the world at the current step (e.g. `Story.state(mapOf("items" to 2), "Basket")`); consecutive snapshots with the same label are diffed at render time
- Step timing: `Story.startTimer()` / `Story.endTimer(token)`
- Trace links: `Story.withTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`

## Output

Raw run JSON is written to `.executable-stories/raw-run.json`, relative to the working
directory — the project directory under both Gradle and Maven. `EXECUTABLE_STORIES_OUTPUT`
overrides the path.

The file is renamed into place, so a watch task reading it while a run finishes always sees
a whole document.

Render reports with `executable-stories-formatters`.

## CLI handoff

The run reports `coveredSourceFiles`, every test class that executed, so a class emptied of
scenarios is distinguishable from one this run never reached, and `incompleteSourceFiles`
for any container that did not succeed or was skipped. A skipped test marks its class the same way,
so switching one off keeps what it last documented rather than deleting it. The second matters because the JUnit Platform
reports an enclosing class as successful even when a `@TestFactory` inside it failed, and a
broken factory otherwise looks exactly like a class whose scenarios were deleted. Acting on that also needs a
scope declaration: the listener detects Maven Surefire's `-Dtest=...` selector, and for
other launcher filters set `EXECUTABLE_STORIES_FILTERED=1`; set it to `0` only when the
invocation covered every scenario in its classes. With neither signal, scope is unknown and
formatting keeps earlier scenarios rather than deleting on a guess.

JUnit 5 exposes no assertion counter. Use `Story.expect("claim") { ... }` to declare
assertion evidence. A plain `Story.then()` followed by `assertEquals` remains unobserved,
not zero.

After running tests, turn the raw-run JSON into reports with the `executable-stories` CLI:

```bash
# The path is optional — `format` defaults to .executable-stories/raw-run.json
executable-stories format --format html

# Diagnose the run JSON if a report won't generate (schema drift, empty run)
executable-stories doctor

# Generate an HTML report
executable-stories format .executable-stories/raw-run.json --format html

# Canonical StoryReport v1 JSON (machine contract)
executable-stories format .executable-stories/raw-run.json --format story-report-json --output-dir reports --output-name index

# List scenarios (discovery / failure triage)
executable-stories list reports/by-file --list-format json
```

## Verify

From repo root:

```bash
pnpm run verify:junit5
```
