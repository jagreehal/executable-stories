# User stories (pytest-example)

User stories are exercised by the Story-based tests in `tests/`:

- **test_calculator_story.py** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **test_story_options_story.py** — Story tags, ticket, and meta via `story.init(..., tags=..., ticket=..., meta=...)`.
- **test_step_aliases_story.py** — Explicit `and_()` and `but()` steps.
- **test_gherkin_patterns_story.py** — Multiple given/when/then (auto-And), explicit and_/but.

After running `pytest`, story metadata is written to `.executable-stories/raw-run.json`. You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
