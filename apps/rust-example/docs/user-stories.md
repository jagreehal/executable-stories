# User stories (rust-example)

User stories are exercised by the Story-based tests in `tests/stories.rs`:

- **Calculator** — add, subtract, multiply, divide, and division-by-zero scenarios.
- **Story options** — tags and tickets via `Story::new("Title").with_tags(...).with_tickets(...)`.
- **Step aliases** — explicit `and()` and `but()` steps.
- **Gherkin patterns** — multiple given/when/then (auto-And), explicit and/but.

After running `cargo test`, story metadata is written to `.executable-stories/raw-run.json` (via a destructor that runs when the test binary exits). You can generate Markdown/HTML reports using the executable-stories-formatters CLI (see [README](../README.md#verification)).
