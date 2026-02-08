# junit5-example

Example app using [executable-stories-junit5](../../packages/executable-stories-junit5). Demonstrates the Story API with calculator scenarios, story options (tags), step aliases (and/but), and Gherkin-style patterns.

## Prerequisites

- Java 21
- Maven

## Verification

1. **Install the package** into your local Maven repository (from repo root):

   ```bash
   mvn -f packages/executable-stories-junit5/pom.xml install
   ```

2. **Run tests** (from repo root or from this directory):

   ```bash
   mvn -f apps/junit5-example/pom.xml test
   # or, from apps/junit5-example:
   mvn test
   ```

3. **Check output** — After tests, `apps/junit5-example/.executable-stories/raw-run.json` should exist and contain run/specs/scenarios with story titles and steps.

4. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm exec executable-stories format apps/junit5-example/.executable-stories/raw-run.json --output-dir apps/junit5-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Java 21 and Maven are available (e.g. in the devcontainer): `pnpm run verify:junit5` or `./scripts/verify-junit5.sh`.
