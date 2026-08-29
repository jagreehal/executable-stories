---
name: ruby-story-api
description: >
  Use when writing BDD story tests in Ruby Minitest with
  executable-stories-ruby: ExecutableStories.init, given/when/then/and/but
  steps, or doc entries.
metadata:
  type: core
  library: executable-stories-ruby
  library_version: "0.1.1"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-ruby/lib/executable_stories"
---

# Writing Ruby Story Tests

## Overview

The `executable-stories-ruby` package provides Ruby-first story/given/when/then helpers for Minitest with doc generation.

## Installation

Add to your Gemfile:

```ruby
gem "executable-stories-ruby"
```

Or install directly:

```bash
gem install executable-stories-ruby
```

## Basic Usage

```ruby
require "minitest/autorun"
require "executable_stories/minitest"

class CalculatorTest < Minitest::Test
  def test_adds_two_numbers
    story = ExecutableStories.init("adds two numbers")

    story.given("two numbers 5 and 3")
    a = 5
    b = 3

    story.when("I add them together")
    result = a + b

    story.then("the result is 8")
    assert_equal 8, result
  end
end
```

`require "executable_stories/minitest"` is the whole setup. It prepends a hook
on `after_teardown`, so each story is recorded with the status Minitest already
worked out, plus the test's file, line, class, and failure message. On
`Minitest.after_run` the collected stories are written to
`.executable-stories/raw-run.json` (override with `EXECUTABLE_STORIES_OUTPUT`).

Call `story.record(status: ...)` yourself only to override that. Recording
happens once per story and the first call wins, so an explicit call still takes
precedence over the hook.

## API Reference

### Creating a Story

```ruby
story = ExecutableStories.init("scenario name")
story = ExecutableStories.init("scenario name", tags: ["smoke"], ticket: "JIRA-123", covers: ["lib/auth.rb"])
story = ExecutableStories.init("scenario name", ticket: [{ id: "JIRA-200", url: "https://jira.example.com/JIRA-200" }])
```

### BDD Step Markers

```ruby
story.given("a precondition")    # -> "Given" (auto-converts to "And" on repeat)
story.when("an action occurs")    # -> "When" (auto-converts to "And" on repeat)
story.then("expected outcome")    # -> "Then" (auto-converts to "And" on repeat)
story.and("another outcome")      # -> "And" (explicit, never converts)
story.but("not this outcome")     # -> "But" (explicit, never converts)
```

### AAA Pattern Aliases

```ruby
story.arrange("precondition")    # -> Given
story.act("action")              # -> When
story.assert_that("outcome")     # -> Then
```

### Additional Aliases

```ruby
story.setup("precondition")      # -> Given
story.context("precondition")    # -> Given
story.execute("action")           # -> When
story.action("action")           # -> When
story.verify("outcome")          # -> Then
```

### Wrapped Step Execution

```ruby
result = story.fn("Given", "setup data") { some_expensive_operation }
story.expect("the result is correct") { assert_equal 8, result }
```

Minitest's live assertion counter is observed automatically. Assertions after a marker
are attributed to the current step, and `story.expect` measures its block. A passing
observable claim with zero assertions is marked in the reports and grades `none`.

Minitest `-n` and RSpec example filters report `runScope: "filtered"`; unfiltered runs
report `"full"`, so persistent per-source state retires missing scenarios only when safe.

### Doc Methods

```ruby
story.note("a note")
story.tag("smoke", "fast")
story.kv("Payment ID", "pay_123")
story.json("Order", { id: 123 })
story.state({ items: [], total: 0 }, label: "Basket")  # state snapshot; same-label snapshots diffed in reports
story.code("Config", "port: 3000", lang: "yaml")
story.table("Users", ["Name", "Role"], [["Alice", "Admin"]])
story.link("API Docs", "https://docs.example.com")
story.section("Details", "This is **important**")
story.mermaid("graph LR; A-->B", title: "Flow")
story.screenshot("/screenshots/result.png", alt: "Final result")
story.custom("metrics", { latency_ms: 42 })
```

`story.state(value, label: nil)` captures what the world looks like at the current step. Steps carrying state docs (or screenshots) become storyboard frames: a label's first appearance shows the full snapshot, consecutive snapshots with the same label render as a diff, and multiple labels appear as side-by-side lanes. Capture the business-relevant projection, not the ORM entity.

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```ruby
story.html(content: chart_html, title: "Latency chart", height: 600)
story.html(url: "https://dash.example.com/run/42", height: 600)
story.html(path: "./reports/summary.html", title: "Summary")
```

**Source guidance:** generated/ephemeral HTML (a skill writing to a temp dir) → pass `content`
(captured now, survives temp-dir cleanup). Stable on-disk artifact → pass `path` (inlined at format time).

**The embedded HTML must be self-contained (a single file).** Local files are inlined as the
iframe's `srcdoc`; relative references to sibling CSS/JS/images are not rewritten, so a multi-file
report renders broken. Use a single-file/inline mode or pass markup via `content`. Directory bundling is planned.

**Sandbox-safe contract:** renders inside `<iframe sandbox="allow-scripts">` (opaque origin, no
allow-same-origin). CDN scripts (Tailwind, Mermaid) and inline DOM scripts work; `localStorage`/
`sessionStorage`/cookies throw `SecurityError` (and an unguarded access aborts the rest of that
script block) — guard with try/catch or avoid. No `window.top`/parent access; no popups.

### Doc Children (Nesting)

```ruby
child = ExecutableStories::DocEntry.note("inner note")
story.kv("outer", "value", children: [child])
```

### Step Timing

```ruby
story.given("slow operation")
token = story.start_timer
perform_slow_operation
story.end_timer(token)
```

### Attachments

```ruby
story.attach("screenshot", "image/png", path: "/tmp/screenshot.png")
story.attach_inline("log", "text/plain", "line1\nline2")
story.attach_spans(spans)
```

### Method Chaining

Steps return `self` for chaining:

```ruby
story.given("a").when("b").then("c")
```

## Output

After running tests with the Minitest plugin, a `raw-run.json` file is written to `.executable-stories/` by default. Set the `EXECUTABLE_STORIES_OUTPUT` environment variable to customize the output path. The run JSON's first key is a `$schema` pointer, so editors validate it as it is written; the adapter also prints a `next:` hint to stderr (silence with `EXECUTABLE_STORIES_QUIET`). Render it with `executable-stories format` (path optional — defaults to `.executable-stories/raw-run.json`) or diagnose it with `executable-stories doctor`.

## Keywords

Ruby reserved words `and`, `then`, and `assert` require special handling:

- `story.and("text")` — works fine (explicit receiver)
- `story.then("text")` — works fine (explicit receiver)
- `story.assert_that("text")` — alias for Then (since `assert` is a keyword)
