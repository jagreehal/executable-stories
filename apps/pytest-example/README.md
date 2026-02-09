# pytest-example

Example app using [executable-stories-pytest](../../packages/executable-stories-pytest). Demonstrates the Story API with calculator scenarios, story options (tags, ticket, meta), step aliases (and\_/but), and Gherkin-style patterns.

## Prerequisites

- Python 3.12+
- pip

## Verification

1. **Install the package** (from repo root):

   ```bash
   pip install -e packages/executable-stories-pytest
   pip install pytest
   ```

2. **Run tests** (from repo root or from this directory):

   ```bash
   cd apps/pytest-example && pytest
   # or from repo root:
   pytest apps/pytest-example
   ```

   If you have conflicting pytest plugins (e.g. logfire), run with `-p no:logfire -p no:langsmith_plugin -p no:anyio`.

3. **Check output** — After tests, `apps/pytest-example/.executable-stories/raw-run.json` should exist and contain run/testCases with story titles and steps.

4. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm --filter executable-stories-formatters build
   node packages/executable-stories-formatters/dist/cli.js format apps/pytest-example/.executable-stories/raw-run.json --output-dir apps/pytest-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Python 3.12+ is available: `pnpm run verify:pytest` or `./scripts/verify-pytest.sh`.
