---
title: Installation (Ruby)
description: Install executable-stories-ruby and configure Minitest or RSpec
---

## Install the packages

```bash
gem install executable-stories-ruby
```

Or add it to your bundle:

```ruby
gem "executable-stories-ruby"
```

If you want the formatter package in the same workflow, add `executable-stories-formatters` to your Node project or CI job that renders the raw run JSON.

## Minitest setup

```ruby
require "minitest/autorun"
require "executable_stories/minitest"
```

The Minitest plugin writes `.executable-stories/raw-run.json` by default after the suite finishes.

## RSpec setup

```ruby
require "rspec"
require "executable_stories/rspec"

ExecutableStories::RSpecPlugin.install!
```

Install the plugin once before your specs run, then call `story(...)` inside `describe` blocks to record scenarios.

## Default output

Both plugins write a raw run JSON file that `executable-stories-formatters` can render directly to Markdown, HTML, JUnit XML, or Cucumber formats.

## Next

[First Story (Ruby)](getting-started/first-story-ruby/) — write your first Ruby scenario.

[Ruby story & doc API](reference/ruby-story-api/) — steps, docs, and adapter options.
