# executable-stories-ruby

Ruby-first story/given/when/then helpers for Minitest and RSpec with Markdown doc generation.

## Installation

Local development expects Ruby 3.1 or newer. The gemspec currently requires Ruby `>= 3.1`, and the committed `Gemfile.lock` was generated with Bundler `2.5.23`.

Add to your Gemfile:

```ruby
gem "executable-stories-ruby"
```

Or install directly:

```bash
gem install executable-stories-ruby
```

If Bundler reports that the lockfile was created with a different version, install the pinned Bundler and use that for package commands:

```bash
gem install bundler -v 2.5.23
bundle _2.5.23_ install
```

## Usage

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

Requiring `executable_stories/minitest` is the whole setup. It hooks
`after_teardown`, so each story is recorded with the status Minitest already
worked out, along with the file, line, and failure message. Call
`story.record(status: ...)` yourself only when you want to override that;
recording happens once, and the first call wins.

### RSpec

```ruby
require "rspec"
require "executable_stories/rspec"

ExecutableStories::RSpecPlugin.install!

RSpec.describe "Calculator" do
  story "adds two numbers" do |s|
    s.given("two numbers 5 and 3")
    a = 5
    b = 3

    s.when("they are added")
    result = a + b

    s.expect("the result is 8") do
      expect(result).to eq(8)
    end
  end
end
```

## API

### Step markers

- `story.given(text)` / `story.when(text)` / `story.then(text)` — BDD keywords (auto-convert to "And" on repeat)
- `story.and(text)` / `story.but(text)` — Explicit keywords (never auto-convert)
- `story.arrange(text)` / `story.act(text)` / `story.assert_that(text)` — AAA aliases
- `story.setup(text)` / `story.context(text)` — Given aliases
- `story.execute(text)` / `story.action(text)` — When aliases
- `story.verify(text)` — Then alias

### Wrapped step execution

- `story.fn(keyword, text) { ... }` — Execute block, mark step as wrapped, record duration
- `story.expect(text) { ... }` — Shorthand for `fn("Then", text) { ... }`

### Doc methods

- `story.note(text, children: nil)`
- `story.tag(*names, children: nil)`
- `story.kv(label, value, children: nil)`
- `story.json(label, value, children: nil)`
- `story.code(label, content, lang: nil, children: nil)`
- `story.table(label, columns, rows, children: nil)`
- `story.link(label, url, children: nil)`
- `story.section(title, markdown, children: nil)`
- `story.mermaid(code, title: nil, children: nil)`
- `story.screenshot(path, alt: nil, children: nil)`
- `story.state(value, label: nil, children: nil)` — JSON-serializable snapshot of "what the world looks like" at this step (a storyboard frame); consecutive same-label states are diffed at render time
- `story.custom(type, data, children: nil)`

### Step timing

- `story.start_timer` — Returns a token
- `story.end_timer(token)` — Records duration on the step

### Attachments

- `story.attach(name, media_type, path: nil, body: nil, ...)` — File or inline attachment
- `story.attach_inline(name, media_type, body, encoding: "IDENTITY")` — Inline content attachment
- `story.attach_spans(spans)` — OTel span attachment

### Options

- `ExecutableStories.init("scenario", tags: [...], ticket: [...], covers: [...], meta: {...})`
  - `covers:` — array of source file paths the scenario exercises (rendered as coverage links in reports)

### RSpec

- `ExecutableStories::RSpecPlugin.install!` — Include the story helper in example groups and write a raw run after the suite
- `story("scenario") { |s| ... }` — Define an RSpec example that records executable-stories output
- Story metadata accepts `tags:`, `ticket:`, `meta:`, and `trace_url_template:`

## Output

After running tests with the Minitest or RSpec plugin, a `raw-run.json` file is written to `.executable-stories/` by default. Set the `EXECUTABLE_STORIES_OUTPUT` environment variable to customize the output path.

That raw run uses the same schema as `executable-stories-formatters`, so you can render it to HTML, Markdown, JUnit, or Cucumber output without a translation step. Pass the file to the `executable-stories` CLI (a positional argument):

```bash
npx --package executable-stories-formatters executable-stories format .executable-stories/raw-run.json --format html

# The path is optional — `format` defaults to .executable-stories/raw-run.json
npx --package executable-stories-formatters executable-stories format --format html

# Diagnose the run JSON if a report won't generate (schema drift, empty run)
npx --package executable-stories-formatters executable-stories doctor
```

## License

MIT
