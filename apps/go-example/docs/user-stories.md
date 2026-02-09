# User stories (go-example)

User stories are exercised by the Story-based tests:

- **calculator_story_test.go** — Calculator add, subtract, multiply, divide, and division-by-zero scenarios.
- **story_options_story_test.go** — Story tags, ticket, and meta via `es.Init(t, "Title", es.WithTags(...), es.WithTicket(...), es.WithMeta(...))`.
- **step_aliases_story_test.go** — Explicit `And` and `But` steps.
- **gherkin_patterns_story_test.go** — Multiple given/when/then (auto-And), explicit And/But.

After running `go test`, story metadata is written to `.executable-stories/raw-run.json`. You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
