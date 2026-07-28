# executable-stories-rust

Rust adapter for executable-stories.

Provides a `Story` API for Rust tests and writes raw story metadata for downstream report generation.

## Install

The crate name is `executable-stories`, so the import path is `executable_stories` (hyphens become underscores). Add it as a dev-dependency along with `dtor`, used to flush results when the test binary exits (destructors moved out of `ctor` into the companion `dtor` crate as of `ctor` 1.0):

```toml
[dev-dependencies]
executable-stories = "0.1"
dtor = "1.0"
```

Or: `cargo add --dev executable-stories dtor`.

## Usage

```rust
use executable_stories::{Story, write_results};

#[test]
fn addition() {
    let mut story = Story::new("adds two numbers");
    story.given("two numbers 2 and 3");
    story.when("I add them");
    story.then("the result is 5");

    assert_eq!(2 + 3, 5);
    story.pass();
}

// Register a destructor so raw-run.json is written when the binary exits.
// The harness never calls a plain teardown function, so #[dtor::dtor] is required.
#[dtor::dtor]
fn write_story_results() {
    write_results();
}
```

## Features

- BDD steps and aliases on `Story`
- Rich docs through `DocEntry`
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

Call `write_results()` (re-exported at the crate root; the `collector` module is private) to write `.executable-stories/raw-run.json`. Register it with `#[dtor::dtor]` so it runs after every test in the binary completes — a plain teardown function is never invoked by the test harness. Override the output path with the `EXECUTABLE_STORIES_OUTPUT` env var.

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
