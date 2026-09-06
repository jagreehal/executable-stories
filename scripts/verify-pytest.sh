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
# Removed first so a stale file from an earlier run cannot pass the checks below.
rm -f "$RAW_RUN"
cd "$ROOT/apps/pytest-example" && pytest -q -p no:logfire -p no:langsmith_plugin -p no:anyio

validate_raw_run "$RAW_RUN" "verify-pytest"

if grep -q '"kind": "state"' "$RAW_RUN"; then
  echo "[verify-pytest] ✓ state doc entry present"
else
  echo "[verify-pytest] ERROR: no state doc entry in $RAW_RUN" >&2
  exit 1
fi

# The executed-file inventory the shared validator cannot see: without it a file
# emptied of scenarios keeps them for good. Paths are relative to the project
# root, which is what keys the stored per-file reports.
node -e '
  const path = require("node:path");
  const run = require(process.argv[1]);
  const covered = run.coveredSourceFiles ?? [];
  if (covered.length === 0) throw new Error("no coveredSourceFiles in the run");
  const absolute = covered.find((f) => path.isAbsolute(f));
  if (absolute) throw new Error(`coveredSourceFiles entry is absolute: ${absolute}`);
  const cases = run.testCases.filter((tc) => tc.sourceFile);
  const absoluteCase = cases.find((tc) => path.isAbsolute(tc.sourceFile));
  if (absoluteCase) throw new Error(`sourceFile is absolute: ${absoluteCase.sourceFile}`);
  const orphan = cases.find((tc) => !covered.includes(tc.sourceFile));
  if (orphan) throw new Error(`scenario in a file the run did not cover: ${orphan.sourceFile}`);
  if (!run.gitSha) throw new Error("no gitSha in the run");
' "$RAW_RUN"
echo "[verify-pytest] ✓ covered files reported, keyed to the project root"

echo "[verify-pytest] OK: adapter-specific checks passed"
