# executable-stories-xunit

xUnit adapter for executable-stories.

Provides a static `Story` API for framework-native xUnit tests and emits reportable raw story metadata.

## Usage

Add the recording attribute once per test project, in any file:

```csharp
using ExecutableStories.Xunit;

[assembly: StoryRecording]
```

Then write tests:

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class CalculatorTests
{
    [Fact]
    public void Addition()
    {
        Story.Init("adds two numbers", "math");
        Story.Given("two numbers 2 and 3");
        Story.When("I add them");
        Story.Then("the result is 5");

        Assert.Equal(5, 2 + 3);
    }
}
```

`[assembly: StoryRecording]` runs after each test, reads the outcome xUnit
already computed, and records the story with its status, failure message, and
the test class as its suite. Put it on a single class or method instead when you
want narrower scope. `Story.RecordAndClear(...)` remains for hand-rolled setups.

## Features

- BDD steps: `Given`, `When`, `Then`, `And`, `But`
- Aliases: `Arrange`, `Act`, `Assert`, `Setup`, `Context`, `Execute`, `Action`, `Verify`
- Rich docs via `Story` and `DocEntry`
- State snapshots: `Story.State(value, label?)` records a JSON snapshot of the world at the current step (e.g. `Story.State(new { Items = 2 }, "Basket")`); consecutive snapshots with the same label are diffed at render time
- Step timing: `Story.StartTimer()` / `Story.EndTimer(token)`
- Trace links: `Story.WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`

## Output

Raw run JSON is written under:

- `.executable-stories/raw-run.json`

Use `executable-stories-formatters` to render HTML/Markdown/JUnit/Cucumber outputs.

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
pnpm run verify:xunit
```
