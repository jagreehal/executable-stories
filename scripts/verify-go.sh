#!/usr/bin/env bash
# Verify executable-stories-go example app: run go test, assert raw-run.json.
# Run from repo root when Go 1.22+ is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/go-example/.executable-stories/raw-run.json"

echo "[verify-go] Running go-example tests..."
cd "$ROOT/apps/go-example" && go test -v -count=1 ./...

if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-go] ERROR: $RAW_RUN not found" >&2
  exit 1
fi

if ! grep -q '"testCases"' "$RAW_RUN" && ! grep -q '"schemaVersion"' "$RAW_RUN"; then
  echo "[verify-go] ERROR: $RAW_RUN does not contain expected structure (testCases/schemaVersion)" >&2
  exit 1
fi

echo "[verify-go] OK: raw-run.json exists and has expected structure"
