#!/usr/bin/env bash
# Verify JUnit 5 package and example app: build package, run example tests, assert raw-run.json.
# Run from repo root when Java 21 is available (e.g. in devcontainer).

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/junit5-example/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

# `build` produces build/libs/*.jar, which the example consumes via a files()
# dependency. We intentionally do NOT publishToMavenLocal here: signAllPublications()
# requires a GPG key the verify environment doesn't have, and the example never
# resolves the artifact from mavenLocal.
echo "[verify-junit5] Building executable-stories-junit5..."
cd "$ROOT/packages/executable-stories-junit5" && ./gradlew build

echo "[verify-junit5] Running junit5-example tests..."
cd "$ROOT/apps/junit5-example" && ./gradlew test

validate_raw_run "$RAW_RUN" "verify-junit5"

# The executed-class inventory the shared validator cannot see: without it a
# class emptied of scenarios keeps them for good.
node -e '
  const run = require(process.argv[1]);
  const covered = run.coveredSourceFiles ?? [];
  if (covered.length === 0) throw new Error("no coveredSourceFiles in the run");
  const planned = run.testCases.filter((tc) => tc.status === "todo");
  const orphan = planned.find((tc) => !tc.sourceFile);
  if (orphan) throw new Error(`planned scenario has no sourceFile: ${orphan.title}`);
' "$RAW_RUN"
echo "[verify-junit5] ✓ covered classes reported, plans keyed to their class"

echo "[verify-junit5] OK: adapter-specific checks passed"
