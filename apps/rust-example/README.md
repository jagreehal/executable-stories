# rust-example

Example app using [executable-stories-rust](../../packages/executable-stories-rust) (crate name: `executable-stories`). Demonstrates the Story API with calculator scenarios, story options (with_tags, with_tickets), step aliases (and/but), and Gherkin-style patterns.

## Prerequisites

- Rust 1.75+ (edition 2021)

## Verification

1. **Run tests** (from repo root or from this directory):

   ```bash
   cd apps/rust-example && cargo test
   # or from repo root:
   cargo test --manifest-path apps/rust-example/Cargo.toml
   ```

   The package is used via a path dependency in `Cargo.toml`, so no separate install step is needed. A destructor runs when the test binary exits and writes `.executable-stories/raw-run.json`.

2. **Check output** — After tests, `apps/rust-example/.executable-stories/raw-run.json` should exist and contain testCases with story titles and steps.

3. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/rust-example/.executable-stories/raw-run.json --output-dir apps/rust-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Rust is available: `pnpm run verify:rust` or `./scripts/verify-rust.sh`.
