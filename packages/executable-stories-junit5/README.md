# executable-stories-junit5

JUnit 5 Kotlin adapter for executable-stories.

Provides a static Story API for framework-native JUnit 5 tests and emits raw story metadata for formatter pipelines.

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

## Verify

From repo root:

```bash
pnpm run verify:junit5
```
