# ruby-example

Example app using [executable-stories-ruby](../../packages/executable-stories-ruby). Demonstrates the Minitest Story API with calculator scenarios, story options (tags, ticket, covers, meta), AAA step aliases, and Gherkin-style patterns (auto-And, But, notes).

## Prerequisites

- Ruby 3.1+ and Bundler

## Verification

1. **Install gems** (from this directory):

   ```bash
   cd apps/ruby-example && bundle install
   ```

   The gem is used via a `path:` dependency in the `Gemfile`, so no publish/install step is needed.

2. **Run tests:**

   ```bash
   bundle exec rake test
   ```

   The Minitest integration (`require "executable_stories/minitest"`) writes results on `Minitest.after_run`. **Each story must call `story.record(status: ...)`** — Minitest has no per-test hook, so a story that never records produces no output.

3. **Check output** — after the run, `apps/ruby-example/.executable-stories/raw-run.json` should exist and contain `testCases` with story titles and steps.

4. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/ruby-example/.executable-stories/raw-run.json --output-dir apps/ruby-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Ruby is available: `pnpm run verify:ruby` or `./scripts/verify-ruby.sh`.
