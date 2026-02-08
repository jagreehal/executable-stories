# User stories (junit5-example)

User stories are exercised by the Story-based tests in `src/test/java/example/`:

- **CalculatorStoryTest** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **StoryOptionsStoryTest** — Story tags via `Story.init("Title", "tag1", "tag2")` and story-level notes.
- **StepAliasesStoryTest** — Explicit `and()` and `but()` steps.
- **GherkinPatternsStoryTest** — Multiple given/when/then (auto-And), explicit and/but.

After running `mvn test`, story metadata is written to `.executable-stories/raw-run.json`. You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
