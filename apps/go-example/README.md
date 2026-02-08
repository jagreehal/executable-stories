# go-example

Example app using [executable-stories-go](../../packages/executable-stories-go). Demonstrates the Story API with calculator scenarios, story options (WithTags, WithTicket, WithMeta), step aliases (And/But), and Gherkin-style patterns.

## Prerequisites

- Go 1.22+

## Verification

1. **Run tests** (from repo root or from this directory):

   ```bash
   cd apps/go-example && go test -v
   # or from repo root:
   go test ./apps/go-example/...
   ```

   The package is used via a `replace` directive in this module's `go.mod`, so no separate install step is needed.

2. **Check output** — After tests, `apps/go-example/.executable-stories/raw-run.json` should exist and contain testCases with story titles and steps.

3. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/go-example/.executable-stories/raw-run.json --output-dir apps/go-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Go is available: `pnpm run verify:go` or `./scripts/verify-go.sh`.
