---
title: First Story (Ruby)
description: Write your first Ruby scenario with Minitest or RSpec
---

## Minitest example

Create a test file such as `test/login_test.rb`:

```ruby
require "minitest/autorun"
require "executable_stories/minitest"

class LoginTest < Minitest::Test
  def test_user_logs_in_successfully
    story = ExecutableStories.init("user logs in successfully")

    story.given("the user is on the login page")
    email = "user@example.com"
    password = "secret"

    story.when("the user submits valid credentials")
    result = email == "user@example.com" && password == "secret"

    story.then("the user should see the dashboard")
    assert_equal true, result
  end
end
```

## RSpec example

Create a spec file such as `spec/login_spec.rb`:

```ruby
require "executable_stories/rspec"

ExecutableStories::RSpecPlugin.install!

RSpec.describe "Login" do
  story "user logs in successfully" do |s|
    s.given("the user is on the login page")
    email = "user@example.com"
    password = "secret"

    s.when("the user submits valid credentials")
    result = email == "user@example.com" && password == "secret"

    s.expect("the user should see the dashboard") do
      expect(result).to be(true)
    end
  end
end
```

## Run tests

```bash
bundle exec ruby -Ilib -Itest test/login_test.rb
```

Or run your specs:

```bash
bundle exec rspec
```

## Generated output

The raw run JSON can be rendered by `executable-stories-formatters`. A Markdown report for the examples above will include the scenario title and the Given/When/Then steps.

## Next

[Ruby story & doc API](/reference/ruby-story-api/) — steps, docs, and options.

[Other adapters](/reference/other-adapters/) — the rest of the repo’s non-JS adapters.
