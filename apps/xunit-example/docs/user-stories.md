# User stories (xunit-example)

User stories are exercised by the Story-based tests:

- **CalculatorStoryTest** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **StoryOptionsStoryTest** — Story tags via `Story.Init("Title", "tag1", "tag2")`.
- **StepAliasesStoryTest** — Explicit `And` and `But` steps.
- **GherkinPatternsStoryTest** — Multiple given/when/then (auto-And), explicit And/But.
- **WrappedStepsStoryTest** — `Story.Fn` and `Story.Expect`, which time their delegate and declare an assertion for the claim.

`AssemblyInfo.cs` carries `[assembly: StoryRecording]`, so every test records itself with the outcome xUnit computed; no test calls `Story.RecordAndClear()` of its own. After `dotnet test`, story metadata is written on process exit to `.executable-stories/raw-run.json` beside this project. Generate Markdown/HTML reports with the executable-stories-formatters CLI (see [README](../README.md#verification)).
