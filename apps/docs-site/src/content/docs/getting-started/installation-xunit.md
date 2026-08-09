---
title: Installation (xUnit)
description: Install ExecutableStories.Xunit and configure your C# test suite to write raw run JSON
---

## Install the package

```bash
dotnet add package ExecutableStories.Xunit
```

Requires .NET 8.0 or later and C# 12 or later.

## Test class setup

The `Story` class uses static methods. Because xUnit creates a new test class instance per test, you must call `Story.RecordAndClear()` at the end of each test (or in `Dispose`) to flush the scenario before the next one starts.

The recommended pattern is to implement `IDisposable` on your test class:

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class LoginTests : IDisposable
{
    public void Dispose()
    {
        Story.RecordAndClear();
    }

    [Fact]
    public void UserLogsInSuccessfully()
    {
        Story.Init("user logs in successfully");

        Story.Given("the user is on the login page");
        // ... test logic ...
        Story.When("the user submits valid credentials");
        // ... assertions ...
        Story.Then("the user should see the dashboard");
    }
}
```

If you do not call `Story.RecordAndClear()`, data from one test will bleed into the next.

## Default output

The raw run JSON is written to `.executable-stories/raw-run.json` when the test process exits. The file is written relative to the working directory, which is typically the test project root.

## Generate a report

Pass the raw run JSON to the `executable-stories` CLI (shipped in the `executable-stories-formatters` package) to render Markdown, HTML, JUnit XML, or Cucumber formats. The input file is a positional argument:

```bash
npx --package executable-stories-formatters executable-stories format .executable-stories/raw-run.json --format markdown
```

Or install the formatters package once in your Node project or CI job and call the `executable-stories` binary directly:

```bash
npm install -D executable-stories-formatters
npx --package executable-stories-formatters executable-stories format .executable-stories/raw-run.json --format markdown
```

## Next

[First Story (xUnit)](/getting-started/first-story-xunit/) — write your first C# scenario.

[xUnit story & doc API](/reference/other-adapters/#xunit--c) — steps, docs, and adapter options.
