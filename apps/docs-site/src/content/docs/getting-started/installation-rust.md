---
title: Installation (Rust)
description: Install executable-stories and configure your Rust test suite to write raw run JSON
---

## Install the crate

```bash
cargo add executable-stories
```

Requires Rust edition 2021 and version 1.75 or later.

If you want OpenTelemetry tracing support, enable the optional `otel` feature:

```bash
cargo add executable-stories --features otel
```

## Test suite setup

Import `Story` from the crate in any test file:

```rust
use executable_stories::Story;
```

At the end of your test suite, call `write_results()` to flush the raw run JSON. The conventional place is a dedicated integration test or a `#[test]` that runs last:

```rust
#[cfg(test)]
mod tests {
    use executable_stories::{write_results, Story};

    // ... your story tests ...

    #[test]
    fn write_report() {
        write_results();
    }
}
```

`write_results()` writes `.executable-stories/raw-run.json` relative to the working directory. Run your tests from the crate root so the file lands in the expected location.

## Marking tests as passed

Every `Story` must be explicitly marked as passed by calling `.pass()`. If `.pass()` is not called before the value is dropped, the scenario is recorded as failed.

```rust
let mut s = Story::new("my scenario");
s.given("the system is ready");
// ... test logic ...
s.pass(); // required — omitting this records a failure
```

## Generate a report

Pass the raw run JSON to `executable-stories-formatters` to render Markdown, HTML, JUnit XML, or Cucumber formats:

```bash
npx executable-stories-formatters format --input .executable-stories/raw-run.json --format markdown
```

Install the formatters package once in your Node project or CI job:

```bash
npm install -D executable-stories-formatters
```

## Next

[First Story (Rust)](getting-started/first-story-rust/) — write your first Rust scenario.

[Rust story & doc API](reference/rust-story-api/) — steps, docs, and adapter options.
