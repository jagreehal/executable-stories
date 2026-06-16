# junit5-example

Example app using [executable-stories-junit5](../../packages/executable-stories-junit5). Demonstrates the Story API with calculator scenarios, story options (tags), step aliases (and/but), and Gherkin-style patterns.

Both this example and the adapter package are Gradle projects (there is no Maven `pom.xml`); use the bundled `./gradlew` wrapper.

## Prerequisites

- Java 21
- No global Gradle install needed — use the `./gradlew` wrapper

## Verification

1. **Build the adapter** so its JAR exists in `packages/executable-stories-junit5/build/libs/` (this example depends on that JAR directly). From `packages/executable-stories-junit5`:

   ```bash
   ./gradlew build
   ```

   To consume the adapter via a coordinate instead of the JAR path, publish it to your local Maven repository:

   ```bash
   ./gradlew publishToMavenLocal
   ```

2. **Run tests** from this directory (`apps/junit5-example`):

   ```bash
   ./gradlew test
   ```

3. **Check output** — After tests, `apps/junit5-example/.executable-stories/raw-run.json` should exist and contain run/specs/scenarios with story titles and steps.

4. **Optional: generate reports** (from repo root; requires Node/pnpm):

   ```bash
   pnpm exec executable-stories format apps/junit5-example/.executable-stories/raw-run.json --output-dir apps/junit5-example/reports --format markdown,html
   ```

You can also run the full verification script from the repo root when Java 21 is available (e.g. in the devcontainer): `pnpm run verify:junit5` or `./scripts/verify-junit5.sh`.
