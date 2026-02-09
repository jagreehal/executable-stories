#!/usr/bin/env bash
# Verify executable-stories-xunit example app: run dotnet test with output path set, assert raw-run.json.
# Run from repo root when .NET 8 is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE_DIR="$ROOT/apps/xunit-example"
RAW_RUN="$EXAMPLE_DIR/.executable-stories/raw-run.json"

echo "[verify-xunit] Running xunit-example tests..."
cd "$EXAMPLE_DIR"
export EXECUTABLE_STORIES_OUTPUT="$RAW_RUN"
dotnet test

if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-xunit] ERROR: $RAW_RUN not found" >&2
  exit 1
fi

if ! grep -q '"testCases"' "$RAW_RUN" && ! grep -q '"schemaVersion"' "$RAW_RUN"; then
  echo "[verify-xunit] ERROR: $RAW_RUN does not contain expected structure (testCases/schemaVersion)" >&2
  exit 1
fi

echo "[verify-xunit] OK: raw-run.json exists and has expected structure"
