#!/usr/bin/env bash
# Verify executable-stories-xunit example app: run dotnet test with output path set, assert raw-run.json.
# Run from repo root when .NET 8+ is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE_DIR="$ROOT/apps/xunit-example"
RAW_RUN="$EXAMPLE_DIR/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-xunit] Running xunit-example tests..."
cd "$EXAMPLE_DIR"
export EXECUTABLE_STORIES_OUTPUT="$RAW_RUN"
dotnet test

validate_raw_run "$RAW_RUN" "verify-xunit"
