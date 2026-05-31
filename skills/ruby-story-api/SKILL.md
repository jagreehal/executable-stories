---
name: ruby-story-api
description: >
  Write BDD stories in Ruby Minitest using executable-stories-ruby.
  API: ExecutableStories.init with given, when, then, and, but steps.
  Doc entries: json, kv, code, table, link, section, mermaid, note, tag,
  screenshot, custom. Auto-And keyword conversion. AAA aliases: arrange,
  act, assert_that.
type: core
library: executable-stories-ruby
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

### Doc Methods

```ruby
story.note("a note")
story.tag("smoke", "fast")
story.kv("Payment ID", "pay_123")
story.json("Order", { id: 123 })
story.code("Config", "port: 3000", lang: "yaml")
story.table("Users", ["Name", "Role"], [["Alice", "Admin"]])
story.link("API Docs", "https://docs.example.com")
story.section("Details", "This is **important**")
story.mermaid("graph LR; A-->B", title: "Flow")
story.screenshot("/screenshots/result.png", alt: "Final result")
story.custom("metrics", { latency_ms: 42 })
```

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

After running tests with the Minitest plugin, a `raw-run.json` file is written to `.executable-stories/` by default. Set the `EXECUTABLE_STORIES_OUTPUT` environment variable to customize the output path.

## Keywords

Ruby reserved words `and`, `then`, and `assert` require special handling:

- `story.and("text")` — works fine (explicit receiver)
- `story.then("text")` — works fine (explicit receiver)
- `story.assert_that("text")` — alias for Then (since `assert` is a keyword)
