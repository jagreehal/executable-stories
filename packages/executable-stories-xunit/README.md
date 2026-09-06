# executable-stories-xunit

xUnit adapter for executable-stories.

Provides a static `Story` API for framework-native xUnit tests and emits reportable raw story metadata.

Requires the .NET 10 SDK and xUnit v3.

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
- Feature declarations: `Story.Feature(title, kind:, narrative:, tags:, glossary:)` from a static constructor says what a class's scenarios are for, ahead of the examples
- Planned scenarios: `Story.Planned("...")` reaches the report as planned, under its own class, without skipping the test
- Rich docs via `Story` and `DocEntry`: `Note`, `Tag`, `Kv`, `Json`, `State`, `Code`, `Table`, `Link`, `Section`, `Mermaid`, `Screenshot`, `Video`, `Html`, `Custom`
- State snapshots: `Story.State(value, label?)` records a JSON snapshot of the world at the current step (e.g. `Story.State(new { Items = 2 }, "Basket")`); consecutive snapshots with the same label are diffed at render time
- Step timing: `Story.StartTimer()` / `Story.EndTimer(token)`
- Trace links: `Story.WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`

## Output

Raw run JSON is written to `.executable-stories/raw-run.json` under your test
project directory, on process exit.

`dotnet test` runs the test host out of `bin/<config>/<tfm>`, so the working
directory is build output rather than the project. The adapter walks up from the
test assembly to the project file instead, which is why the report lands where
you would look for it. `EXECUTABLE_STORIES_OUTPUT` sets the file path — a
relative one resolves against that same project directory, not the working
directory, so it cannot land back under `bin/`;
`EXECUTABLE_STORIES_PROJECT_ROOT` sets the directory it resolves against, for a
layout that puts build output somewhere else.

The file is written to a temporary name and renamed into place, so a watch task
reading it while a run finishes always sees a complete document.

Use `executable-stories-formatters` to render HTML/Markdown/JUnit/Cucumber outputs.

## CLI handoff

The run reports `coveredSourceFiles`, every test class that executed, so a class
emptied of scenarios is distinguishable from one this run never reached. A run
that reached classes but told no story at all is still written, since that is
exactly the case the inventory exists to report. Acting on
that also needs a scope declaration: `dotnet test --filter` is applied before the
adapter can see it, so set `EXECUTABLE_STORIES_FILTERED=1` for a narrowed run, or
`=0` only for an invocation that covered every scenario in its classes. With no
declaration, formatting preserves earlier scenarios and warns rather than deleting
on a guess.

xUnit exposes no assertion counter. Use `Story.Expect("claim", () => { ... })` to declare
assertion evidence. A plain `Story.Then()` followed by `Assert.*` remains unobserved, not
zero.

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
pnpm run verify:xunit
```
