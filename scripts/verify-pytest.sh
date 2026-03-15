#!/usr/bin/env bash
# Verify executable-stories-pytest package and example app: install package, run example tests, assert raw-run.json.
# Run from repo root when Python 3.12+ is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/pytest-example/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-pytest] Installing executable-stories-pytest..."
pip install -q -e "$ROOT/packages/executable-stories-pytest"
pip install -q pytest

echo "[verify-pytest] Running pytest-example tests..."
cd "$ROOT/apps/pytest-example" && pytest -q -p no:logfire -p no:langsmith_plugin -p no:anyio

validate_raw_run "$RAW_RUN" "verify-pytest"
