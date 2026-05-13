# executable-stories-rust

Rust adapter for executable-stories.

Provides a `Story` API for Rust tests and writes raw story metadata for downstream report generation.

## Usage

```rust
use executable_stories_rust::Story;

#[test]
fn addition() {
    let mut story = Story::new("adds two numbers");
    story.given("two numbers 2 and 3");
    story.when("I add them");
    story.then("the result is 5");

    assert_eq!(2 + 3, 5);
}
```

## Features

- BDD steps and aliases on `Story`
- Rich docs through `DocEntry`
- Timing helpers (`start_timer` / `end_timer`)
- Optional OTel trace integration (`otel` feature) with trace URL templates
- Raw run writer API for formatter compatibility

## Output

Write raw runs with the crate API and feed them to `executable-stories-formatters` for report generation.

## Verify

From repo root:

```bash
pnpm run verify:rust
```
