#!/usr/bin/env bash
# Verify executable-stories-rust example app: run cargo test, assert raw-run.json.
# Run from repo root when Rust (cargo) is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/rust-example/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-rust] Running rust-example tests..."
cd "$ROOT/apps/rust-example" && cargo test --no-fail-fast

validate_raw_run "$RAW_RUN" "verify-rust"
