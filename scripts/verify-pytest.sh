#!/usr/bin/env bash
# Verify executable-stories-pytest package and example app: install package, run example tests, assert raw-run.json.
# Run from repo root when Python 3.12+ is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/pytest-example/.executable-stories/raw-run.json"

echo "[verify-pytest] Installing executable-stories-pytest..."
pip install -q -e "$ROOT/packages/executable-stories-pytest"
pip install -q pytest

echo "[verify-pytest] Running pytest-example tests..."
cd "$ROOT/apps/pytest-example" && pytest -q -p no:logfire -p no:langsmith_plugin -p no:anyio

if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-pytest] ERROR: $RAW_RUN not found" >&2
  exit 1
fi

if ! grep -q '"testCases"' "$RAW_RUN" && ! grep -q '"schemaVersion"' "$RAW_RUN"; then
  echo "[verify-pytest] ERROR: $RAW_RUN does not contain expected structure (testCases/schemaVersion)" >&2
  exit 1
fi

echo "[verify-pytest] OK: raw-run.json exists and has expected structure"
