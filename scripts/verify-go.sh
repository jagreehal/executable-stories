#!/usr/bin/env bash
# Verify executable-stories-go example app: run go test, assert raw-run.json.
# Run from repo root when Go 1.22+ is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/go-example/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-go] Running go-example tests..."
cd "$ROOT/apps/go-example" && go test -v -count=1 ./...

validate_raw_run "$RAW_RUN" "verify-go"
