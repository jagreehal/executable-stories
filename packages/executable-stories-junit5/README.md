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
- Rich docs via `Story.*` and `DocEntry.*`
- Step timing: `Story.startTimer()` / `Story.endTimer(token)`
- Trace links: `Story.withTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`

## Output

Raw run JSON is written to:

- `.executable-stories/raw-run.json`

Render reports with `executable-stories-formatters`.

## CLI handoff

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
executable-stories list .executable-stories/raw-run.json --list-format json
```

## Verify

From repo root:

```bash
pnpm run verify:junit5
```
