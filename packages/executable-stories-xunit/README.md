# executable-stories-xunit

xUnit adapter for executable-stories.

Provides a static `Story` API for framework-native xUnit tests and emits reportable raw story metadata.

## Usage

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

## Features

- BDD steps: `Given`, `When`, `Then`, `And`, `But`
- Aliases: `Arrange`, `Act`, `Assert`, `Setup`, `Context`, `Execute`, `Action`, `Verify`
- Rich docs via `Story` and `DocEntry`
- Step timing: `Story.StartTimer()` / `Story.EndTimer(token)`
- Trace links: `Story.WithTraceUrlTemplate(...)` or `OTEL_TRACE_URL_TEMPLATE`

## Output

Raw run JSON is written under:

- `.executable-stories/raw-run.json`

Use `executable-stories-formatters` to render HTML/Markdown/JUnit/Cucumber outputs.

## Verify

From repo root:

```bash
pnpm run verify:xunit
```
