#!/usr/bin/env bash
# Run all language adapter verify scripts and print a summary.
# Usage: ./scripts/verify-all.sh [adapter...]
# If no adapters specified, runs all available.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ALL_ADAPTERS=(go pytest rust xunit junit5 ruby)
if [ $# -gt 0 ]; then
  ADAPTERS=("$@")
else
  ADAPTERS=("${ALL_ADAPTERS[@]}")
fi

# Build formatters CLI first (needed by validate_raw_run)
echo "[verify-all] Building formatters CLI..."
cd "$ROOT" && pnpm --filter executable-stories-formatters run build

FAILED=0
PASSED=0
SKIPPED=0
SUMMARY=""

for adapter in "${ADAPTERS[@]}"; do
  SCRIPT="$ROOT/scripts/verify-${adapter}.sh"
  if [ ! -f "$SCRIPT" ]; then
    echo "[verify-all] No script for '$adapter', skipping"
    SUMMARY="${SUMMARY}  ${adapter}  SKIP\n"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo ""
  echo "================================================================"
  echo "  Running: verify-${adapter}.sh"
  echo "================================================================"

  if bash "$SCRIPT"; then
    SUMMARY="${SUMMARY}  ${adapter}  PASS\n"
    PASSED=$((PASSED + 1))
  else
    SUMMARY="${SUMMARY}  ${adapter}  FAIL\n"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "================================================================"
echo "  Summary"
echo "================================================================"
printf "  %-12s %s\n" "Adapter" "Result"
printf "  %-12s %s\n" "-------" "------"
printf "$SUMMARY"

echo ""
echo "  Passed: $PASSED  Failed: $FAILED  Skipped: $SKIPPED"
echo ""
if [ "$FAILED" -gt 0 ]; then
  echo "[verify-all] $FAILED adapter(s) failed."
  exit 1
else
  echo "[verify-all] All adapters passed!"
fi
