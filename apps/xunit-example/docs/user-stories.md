# User stories (xunit-example)

User stories are exercised by the Story-based tests:

- **CalculatorStoryTest** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **StoryOptionsStoryTest** — Story tags via `Story.Init("Title", "tag1", "tag2")`.
- **StepAliasesStoryTest** — Explicit `And` and `But` steps.
- **GherkinPatternsStoryTest** — Multiple given/when/then (auto-And), explicit And/But.

After running `dotnet test`, story metadata is written to `.executable-stories/raw-run.json` (on process exit when using the in-process collector; call `Story.RecordAndClear()` at the end of each test). You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
