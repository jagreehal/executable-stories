# xunit-example

Example app using [ExecutableStories.Xunit](../../packages/executable-stories-xunit). Demonstrates the Story API with calculator scenarios, story options (tags), step aliases (And/But), and Gherkin-style patterns.

## Prerequisites

- .NET 8.0 SDK

## Verification

1. **Run tests** (from repo root or from this directory):

   ```bash
   cd apps/xunit-example && dotnet test
   # or from repo root:
   dotnet test apps/xunit-example/xunit-example.csproj
   ```

   The package is used via a project reference. When using `dotnet test`, call `Story.RecordAndClear()` at the end of each test so results are written to `.executable-stories/raw-run.json` on process exit.

2. **Check output** — After tests, `apps/xunit-example/.executable-stories/raw-run.json` should exist (the verify script sets `EXECUTABLE_STORIES_OUTPUT` so the file is written there).

3. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/xunit-example/.executable-stories/raw-run.json --output-dir apps/xunit-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when .NET 8 is available: `pnpm run verify:xunit` or `./scripts/verify-xunit.sh`.
