#!/usr/bin/env bash
# Verify JUnit 5 package and example app: build package, run example tests, assert raw-run.json.
# Run from repo root when Java 21 is available (e.g. in devcontainer).

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/junit5-example/.executable-stories/raw-run.json"

echo "[verify-junit5] Building executable-stories-junit5..."
cd "$ROOT/packages/executable-stories-junit5" && ./gradlew build publishToMavenLocal

echo "[verify-junit5] Running junit5-example tests..."
cd "$ROOT/apps/junit5-example" && ./gradlew test

if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-junit5] ERROR: $RAW_RUN not found" >&2
  exit 1
fi

if ! grep -q '"testCases"' "$RAW_RUN" && ! grep -q '"schemaVersion"' "$RAW_RUN"; then
  echo "[verify-junit5] ERROR: $RAW_RUN does not contain expected structure (testCases/schemaVersion)" >&2
  exit 1
fi

echo "[verify-junit5] OK: raw-run.json exists and has expected structure"
