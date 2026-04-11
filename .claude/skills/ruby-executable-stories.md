---
name: ruby-story-api
description: >
  Write BDD stories in Ruby using executable-stories-ruby (Minitest). Init with
  ExecutableStories.init(scenario). Steps: given, when, then, and, but. Aliases:
  arrange, act, assert_that, setup, context, execute, action, verify. Wrapped
  steps: fn, expect. Doc entries: json, kv, code, table, link, section, mermaid,
  note, tag, screenshot, custom. Auto-And keyword conversion. Automatic JSON
  output via Minitest plugin.
type: core
library: executable-stories-ruby
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-ruby/lib/executable_stories/story.rb"
---

# executable-stories-ruby — Story API

## Setup

### JSON output (required for reports)

The Minitest plugin writes `.executable-stories/raw-run.json` automatically after all tests complete. Override the path with `EXECUTABLE_STORIES_OUTPUT` env var. To generate HTML/Markdown reports from this JSON, run:

```bash
gem install executable_stories

# Requires Node.js >= 22 (install from https://nodejs.org)
npm install -g executable-stories-formatters
executable-stories format .executable-stories/raw-run.json --format html,markdown --output-dir reports
```

This produces `reports/test-results.html` and `reports/test-results.md`. See formatters-cli skill for full CLI options, CI setup, and asset bundling.

### Story API usage

```ruby
require "minitest/autorun"
require "executable_stories/minitest"

class CartCheckoutTest < Minitest::Test
  def test_applies_discount_code
    story = ExecutableStories.init("Applies discount code",
      tags: ["checkout"], ticket: "CART-42")

    story.given("a cart with items totaling $100")
    cart = create_cart([{ name: "Shirt", price: 100 }])

    story.when("a 20% discount code is applied")
    apply_discount(cart, "SAVE20")

    story.then("the total is $80")
    assert_equal 80, cart.total

    story.and("the discount is shown in the summary")
    assert_equal 1, cart.discounts.length
  end
end
```

## Core Patterns

### Step markers with Auto-And conversion

First call to `given()`, `when()`, or `then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `and()` always renders "And". Explicit `but()` always renders "But" and never auto-converts.

```ruby
def test_blocks_suspended_user_login
  story = ExecutableStories.init("Blocks suspended user login")

  story.given("the user account exists")         # renders "Given"
  story.given("the account is suspended")         # renders "And" (auto-converted)
  story.when("the user submits valid credentials")
  story.then("the user sees an error message")
  story.but("the user is not logged in")          # renders "But" (always)
end
```

### Step aliases

AAA pattern: `story.arrange()` (Given), `story.act()` (When), `story.assert_that()` (Then).

Additional: `story.setup()`, `story.context()` (Given), `story.execute()`, `story.action()` (When), `story.verify()` (Then).

### Doc entries attached to steps

```ruby
def test_processes_payment
  story = ExecutableStories.init("Processes payment")

  story.given("a valid payment request")
  story.json("Request payload", { amount: 50, currency: "USD" })
  story.kv("Gateway", "stripe")

  story.when("the payment is submitted")
  story.code("Response", '{ "status": "ok" }', lang: "json")

  story.then("the order is confirmed")
  story.table("Order summary",
    ["Item", "Qty", "Price"],
    [["Widget", "2", "$25"]])
  story.link("API docs", "https://docs.example.com/payments")
  story.note("Payment processed in sandbox mode")
end
```

### Step wrappers with timing

```ruby
result = story.fn("When", "the profile is fetched") { fetch_profile("user-123") }

story.expect("the profile contains the correct name") {
  assert_equal "Alice", result.name
}
```

`fn` and `expect` wrap a block with automatic timing. Exceptions propagate after duration is recorded.

### Manual step timing

```ruby
story.given("a step to time")
token = story.start_timer
# ... work ...
story.end_timer(token)
```

### Attachments

```ruby
story.attach("debug.log", "text/plain", path: "/tmp/debug.log")
story.attach_inline("config", "application/json", '{"key":"val"}')
```

## Common Mistakes

### CRITICAL Missing ExecutableStories.init() before steps

Wrong:

```ruby
def test_my_scenario
  story.given("something")  # NameError: no story variable
end
```

Correct:

```ruby
def test_my_scenario
  story = ExecutableStories.init("My scenario")
  story.given("something")
end
```

`ExecutableStories.init()` creates the story context and returns the story object. Without it, there is no story to call steps on.

Source: packages/executable-stories-ruby/lib/executable_stories/story.rb

### HIGH Using assert instead of assert_that

Wrong:

```ruby
story.assert("result is correct")  # NoMethodError
```

Correct:

```ruby
story.assert_that("result is correct")
```

The Then alias is `assert_that()` because `assert` conflicts with Minitest's built-in assertion method.

Source: packages/executable-stories-ruby/lib/executable_stories/story.rb
