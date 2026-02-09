#!/usr/bin/env bash
# Verify executable-stories-rust example app: run cargo test, assert raw-run.json.
# Run from repo root when Rust (cargo) is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/rust-example/.executable-stories/raw-run.json"

echo "[verify-rust] Running rust-example tests..."
cd "$ROOT/apps/rust-example" && cargo test --no-fail-fast

if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-rust] ERROR: $RAW_RUN not found" >&2
  exit 1
fi

if ! grep -q '"testCases"' "$RAW_RUN" && ! grep -q '"schemaVersion"' "$RAW_RUN"; then
  echo "[verify-rust] ERROR: $RAW_RUN does not contain expected structure (testCases/schemaVersion)" >&2
  exit 1
fi

echo "[verify-rust] OK: raw-run.json exists and has expected structure"
