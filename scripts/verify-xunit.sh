#!/usr/bin/env bash
# Verify executable-stories-xunit example app: run dotnet test, assert raw-run.json.
# Run from repo root when the .NET 10 SDK is available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE_DIR="$ROOT/apps/xunit-example"
RAW_RUN="$EXAMPLE_DIR/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-xunit] Running xunit-example tests..."
cd "$EXAMPLE_DIR"
# No EXECUTABLE_STORIES_OUTPUT: the default path is the thing under test, since
# a user who never sets it is the one who has to find the file.
rm -f "$RAW_RUN"
dotnet test

validate_raw_run "$RAW_RUN" "verify-xunit"

# The default run file lands beside the project, not under bin/<config>/<tfm>
# where dotnet test happens to set the working directory.
if [ ! -f "$RAW_RUN" ]; then
  echo "[verify-xunit] ERROR: default output path did not produce $RAW_RUN" >&2
  exit 1
fi
echo "[verify-xunit] ✓ default output path used"

# Two things the shared validator cannot see: the executed-class inventory,
# without which a class emptied of scenarios keeps them for good, and a plan's
# source key, without which every planned scenario in the suite collects under
# one "unknown" heading away from its own feature.
node -e '
  const run = require(process.argv[1]);
  const covered = run.coveredSourceFiles ?? [];
  if (covered.length === 0) throw new Error("no coveredSourceFiles in the run");
  const planned = run.testCases.filter((tc) => tc.status === "todo");
  if (planned.length === 0) throw new Error("no planned scenario in the run");
  const orphan = planned.find((tc) => !tc.sourceFile);
  if (orphan) throw new Error(`planned scenario has no sourceFile: ${orphan.title}`);
' "$RAW_RUN"
echo "[verify-xunit] ✓ covered classes reported, plans keyed to their class"

echo "[verify-xunit] OK: adapter-specific checks passed"
