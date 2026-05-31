---
title: Ruby story & doc API
description: story.init() for Minitest, story() for RSpec, and the shared doc API
---

The Ruby package exposes the same story model as the rest of the repo, but with framework-native entry points for **Minitest** and **RSpec**. Both adapters write the same raw run JSON that `executable-stories-formatters` consumes.

## Minitest

Use `ExecutableStories.init("scenario")` inside a normal Minitest test and call the step methods on the returned story object.

```ruby
story = ExecutableStories.init("user logs in successfully", tags: %w[smoke auth])
story.given("the user is on the login page")
story.when("the user submits valid credentials")
story.then("the user should see the dashboard")
```

### Story methods

- `given(text)` / `when(text)` / `then(text)` - BDD keywords with auto-And conversion on repeat
- `and(text)` / `but(text)` - explicit keywords that never auto-convert
- `arrange(text)` / `act(text)` / `assert_that(text)` - AAA aliases
- `setup(text)` / `context(text)` - Given aliases
- `execute(text)` / `action(text)` - When aliases
- `verify(text)` - Then alias
- `fn(keyword, text) { ... }` - wrap a block and capture duration
- `expect(text) { ... }` - shorthand for `fn("Then", text) { ... }`

### Doc methods

- `note(text, children: nil)`
- `tag(*names, children: nil)`
- `kv(label, value, children: nil)`
- `json(label, value, children: nil)`
- `code(label, content, lang: nil, children: nil)`
- `table(label, columns, rows, children: nil)`
- `link(label, url, children: nil)`
- `section(title, markdown, children: nil)`
- `mermaid(code, title: nil, children: nil)`
- `screenshot(path, alt: nil, children: nil)`
- `custom(type, data, children: nil)`

### Adapter options

- `tags:` - array of tags for the story
- `ticket:` - string, array, or ticket objects with `id` and optional `url`
- `covers:` - array of product-code paths/globs this scenario exercises (powers code→scenario lookup)
- `meta:` - arbitrary metadata hash
- `trace_url_template:` - template used to generate a trace link when OTel is active

## RSpec

Use `ExecutableStories::RSpecPlugin.install!` once in your spec setup, then call `story("scenario") { |s| ... }` inside a `describe` block.

```ruby
RSpec.describe "Login" do
  story "user logs in successfully", tags: %w[smoke auth] do |s|
    s.given("the user is on the login page")
    s.when("the user submits valid credentials")
    s.expect("the user should see the dashboard") do
      expect(true).to be(true)
    end
  end
end
```

RSpec examples automatically capture:

- `titlePath` from the example group nesting
- `sourceFile` and `sourceLine` from RSpec metadata
- `status` from the example outcome
- `story.meta["rspec"]` with `fullDescription`, `description`, `filePath`, `lineNumber`, and `scopedId`

The Ruby RSpec adapter preserves the same story API and raw JSON shape as the Minitest path, so the formatter package can render both without special handling.
