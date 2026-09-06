# User stories (junit5-example)

User stories are exercised by the Story-based tests in `src/test/kotlin/example/`:

- **CalculatorStoryTest** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **StoryOptionsStoryTest** — Story tags via `Story.init("Title", "tag1", "tag2")` and story-level notes.
- **StepAliasesStoryTest** — Explicit `and()` and `but()` steps.
- **GherkinPatternsStoryTest** — Multiple given/when/then (auto-And), explicit and/but.
- **WrappedStepsStoryTest** — `Story.fn` and `Story.expect`, which time their body and declare an assertion for the claim.

After running `./gradlew test`, story metadata is written on suite completion to `.executable-stories/raw-run.json` beside this project; the `StoryTestExecutionListener` registers itself, so no test wires anything up. You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
