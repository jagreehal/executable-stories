---
title: Installation (Rust)
description: Install executable-stories and configure your Rust test suite to write raw run JSON
---

## Install the crate

```bash
cargo add executable-stories
```

Requires Rust 1.85 or later, edition 2024.

If you want OpenTelemetry tracing support, enable the optional `otel` feature:

```bash
cargo add executable-stories --features otel
```

## Test suite setup

Import `Story` from the crate in any test file:

```rust
use executable_stories::Story;
```

There is no reporter to register. The first `Story` installs a process-exit hook
that writes `.executable-stories/raw-run.json` under the project root. Set
`EXECUTABLE_STORIES_OUTPUT` to write elsewhere — a relative path resolves against
the project root, an absolute one is used as given — or call `write_results()`
yourself to choose the moment. The file is renamed into place, so a reader never
sees a half-written run.

Cargo compiles every file under `tests/` into a separate binary, and each one
writes that same default path — as do doctests, which `rustdoc` runs as processes
of its own. Keep story tests in one file, or give each binary its own
`EXECUTABLE_STORIES_OUTPUT` and format the runs separately.

## How a scenario gets its status

The story records `pass` or `fail` when it drops. A failing assertion panics,
and a story dropped while the thread unwinds records `fail`.

A `#[test]` that returns `Result` is the exception, because returning `Err`
fails the test without panicking. Route the fallible call through
`record_result`:

```rust
#[test]
fn parses_a_price() -> Result<(), std::num::ParseIntError> {
    let mut s = Story::new("parses a price");
    s.then("the string parses to 499");

    let parsed = s.record_result("499".parse::<u32>())?;
    assert_eq!(parsed, 499);
    Ok(())
}
```

`s.fail()` sets the status directly if you would rather branch yourself.

## Generate a report

Pass the raw run JSON to `executable-stories-formatters` to render Markdown, HTML, JUnit XML, or Cucumber formats:

```bash
npx --package executable-stories-formatters executable-stories format --format markdown
```

Install the formatters package once in your Node project or CI job:

```bash
npm install -D executable-stories-formatters
```

## Next

[First Story (Rust)](/getting-started/first-story-rust/) — write your first Rust scenario.

[Rust story & doc API](/reference/other-adapters/#rust) — steps, docs, and adapter options.
