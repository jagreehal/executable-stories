---
title: Installation (xUnit)
description: Install ExecutableStories.Xunit and configure your C# test suite to write raw run JSON
---

## Install the package

```bash
dotnet add package ExecutableStories.Xunit
```

Requires the .NET 10 SDK and xUnit v3.

## Test class setup

Add the recording attribute once, in any file in your test project:

```csharp
using ExecutableStories.Xunit;

[assembly: StoryRecording]
```

That covers every test in the assembly. It runs after each test, reads the
outcome xUnit already computed, and records the story with the right status,
the failure message, and the test class as its suite. Tests themselves call
`Story.Init` and the step methods, nothing more.

`[StoryRecording]` also works on a single class or method when you want
narrower scope. `Story.RecordAndClear(...)` is still there for hand-rolled
setups.

The recommended pattern is to implement `IDisposable` on your test class:

```csharp
using ExecutableStories.Xunit;
using Xunit;

public class LoginTests : IDisposable
{
    public void Dispose()
    {
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

Without the attribute nothing is recorded, since no test flushes its own story.

## Default output

The raw run JSON is written to `.executable-stories/raw-run.json` when the test
process exits, under your test project directory.

`dotnet test` runs the test host out of `bin/<config>/<tfm>`, so the working
directory is build output rather than the project. The adapter walks up from the
test assembly to the project file instead, which is why the report lands where
you would look for it. `EXECUTABLE_STORIES_OUTPUT` sets the file path — a
relative one resolves against that same project directory, not the working
directory, so it cannot land back under `bin/`. `EXECUTABLE_STORIES_PROJECT_ROOT`
sets the directory both resolve against, for a layout that puts build output
somewhere else.

The file is written to a temporary name and renamed into place, so a watch task
reading it while a run finishes always sees a complete document.

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
