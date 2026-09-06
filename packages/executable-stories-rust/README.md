# executable-stories-rust

Rust adapter for executable-stories.

Provides a `Story` API for Rust tests and writes raw story metadata for downstream report generation.

## Install

The crate name is `executable-stories`, so the import path is `executable_stories` (hyphens become underscores):

```toml
[dev-dependencies]
executable-stories = "0.1"
```

Or: `cargo add --dev executable-stories`.

## Usage

```rust
use executable_stories::Story;

#[test]
fn addition() {
    let mut story = Story::new("adds two numbers");
    story.given("two numbers 2 and 3");
    story.when("I add them");
    story.then("the result is 5");

    assert_eq!(2 + 3, 5);
}
```

## Status

The story records `pass` or `fail` on drop. A failing assertion panics, and a
story dropped mid-unwind records `fail`, so passing tests need no extra call.

One case escapes that: a `#[test]` returning `Result` fails by returning `Err`,
which never panics. Wrap the fallible call so the story sees it:

```rust
#[test]
fn parses_a_price() -> Result<(), std::num::ParseIntError> {
    let mut story = Story::new("parses a price");
    story.given("the string 499");
    story.then("it parses to 499");

    let parsed = story.record_result("499".parse::<u32>())?;
    assert_eq!(parsed, 499);
    Ok(())
}
```

`story.fail()` sets the status directly if you would rather branch yourself.

## Features

- BDD steps and aliases on `Story`
- Feature declarations: `declare_feature!` at module scope heads every scenario in the file
- Planned scenarios: `Story::planned("…")` records behaviour that is specified but not built
- Rich docs through `DocEntry`: `note`, `tag`, `kv`, `json_doc`, `code`, `table`, `link`,
  `section`, `mermaid`, `screenshot`, `video`, `html`, `state`, `custom`
- Timing helpers (`start_timer` / `end_timer`)
- Optional OTel trace integration (`otel` feature) with trace URL templates
- Raw run writer API for formatter compatibility

OTel methods and trace-URL templating are gated behind the optional `otel` Cargo feature. Without it, those methods compile as no-ops. Enable with `executable-stories = { version = "0.1", features = ["otel"] }`.

## State snapshots

`story.state(label, value)` captures a JSON-serializable snapshot of "what the world looks like" at the current step. Consecutive snapshots with the same label are diffed by the report renderer (storyboard frames); the adapter only serializes and emits. Pass `None` for an anonymous state lane (the label field is omitted).

```rust
story.given("an item is added to the basket");
story.state(Some("Basket"), serde_json::json!({"items": [{"sku": "A1", "qty": 2}]}));

story.when("a discount is applied");
story.state(Some("Basket"), serde_json::json!({"items": [{"sku": "A1", "qty": 2}], "discount": 0.1}));
```

## Output

The first `Story` registers a process-exit hook, so `.executable-stories/raw-run.json`
lands under the project root after the last test in the binary finishes. Nothing to wire
up. Call `write_results()` directly to control when the file is written, and set
`EXECUTABLE_STORIES_OUTPUT` to change the path: a relative path resolves against the
project root, an absolute one is used as given. The file is renamed into place, so a
reader never sees a half-written run.

Cargo compiles every file under `tests/` into its own binary, and each one writes the same
path — as do doctests, which `rustdoc` runs as processes of its own. Keep story tests in a
single file, or give each binary its own `EXECUTABLE_STORIES_OUTPUT`. Formatting the raw run
updates one canonical report per source under `reports/by-file/`.

Each run also records what produced it:

- `startedAtMs` / `finishedAtMs` — when the binary ran, which is what stamps a scenario's
  freshness in the report
- `gitSha` — the commit the run describes, from CI's environment or `git rev-parse HEAD`
- `packageVersion` — the adapter version that wrote the run
- `runScope` — `"filtered"` when the test binary's arguments narrowed the run with a
  positional name filter, `--skip`, or `--ignored`; otherwise `"full"`

Rust exposes no assertion counter. Use `story.expect_step("claim", || { ... })` to
declare assertion evidence. A plain `story.then()` followed by `assert!` remains
unobserved rather than being treated as zero.

Then feed the raw-run JSON to `executable-stories-formatters` for report generation:

```bash
executable-stories format .executable-stories/raw-run.json --format html

# The path is optional — `format` defaults to .executable-stories/raw-run.json
executable-stories format --format html

# Diagnose the run JSON if a report won't generate (schema drift, empty run)
executable-stories doctor
```

## Verify

From repo root:

```bash
pnpm run verify:rust
```
