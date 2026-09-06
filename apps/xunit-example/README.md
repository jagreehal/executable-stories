# xunit-example

Example app using [ExecutableStories.Xunit](../../packages/executable-stories-xunit). Demonstrates the Story API with calculator scenarios, story options (tags), step aliases (And/But), and Gherkin-style patterns.

## Prerequisites

- .NET 10 SDK

## Verification

1. **Run tests** (from repo root or from this directory):

   ```bash
   cd apps/xunit-example && dotnet test
   # or from repo root:
   dotnet test apps/xunit-example/xunit-example.csproj
   ```

   The package is used via a project reference. `AssemblyInfo.cs` carries `[assembly: StoryRecording]`, so every test records itself and results are written to `.executable-stories/raw-run.json` on process exit.

2. **Check output** — After tests, `apps/xunit-example/.executable-stories/raw-run.json` should exist. Nothing has to be configured for it: the adapter resolves the project directory from the test assembly rather than trusting the working directory, which `dotnet test` sets to `bin/<config>/<tfm>`.

3. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/xunit-example/.executable-stories/raw-run.json --output-dir apps/xunit-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when the .NET 10 SDK is available: `pnpm run verify:xunit` or `./scripts/verify-xunit.sh`.
