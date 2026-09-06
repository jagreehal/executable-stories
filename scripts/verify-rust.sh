#!/usr/bin/env bash
# Verify executable-stories-rust example app: run cargo test, assert raw-run.json.
# Run from repo root when Rust (cargo) is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_RUN="$ROOT/apps/rust-example/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-rust] Running rust-example tests..."
# Removed first so a stale file from an earlier run cannot pass the checks below.
rm -f "$RAW_RUN"
cd "$ROOT/apps/rust-example" && cargo test --no-fail-fast

validate_raw_run "$RAW_RUN" "verify-rust"

# What the shared validator cannot see: a run that cannot say when it ran or which
# commit it describes leaves every scenario in the report undateable.
node -e '
  const run = require(process.argv[1]);
  const files = new Set(run.testCases.map((tc) => tc.sourceFile).filter(Boolean));
  const declared = new Set((run.features ?? []).map((f) => f.sourceFile));
  for (const file of files) {
    if (!declared.has(file)) throw new Error(`no feature declaration for ${file}`);
  }
  if (!run.gitSha) throw new Error("no gitSha in the run");
  if (!run.packageVersion) throw new Error("no packageVersion in the run");
  if (!(run.finishedAtMs >= run.startedAtMs && run.startedAtMs > 0)) {
    throw new Error("run is missing usable timestamps");
  }
' "$RAW_RUN"
echo "[verify-rust] ✓ run carries its declaration and provenance"

echo "[verify-rust] OK: adapter-specific checks passed"
