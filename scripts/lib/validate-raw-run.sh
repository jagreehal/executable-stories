#!/usr/bin/env bash
# Shared validation helper for verify-*.sh scripts.
# Source this file, then call validate_raw_run <path-to-raw-run.json> <label> [min-test-cases]

validate_raw_run() {
  local RAW_RUN="$1"
  local LABEL="$2"
  local MIN_CASES="${3:-1}"
  local ROOT
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  local CLI="$ROOT/packages/executable-stories-formatters/dist/cli.js"

  # 1. File exists
  if [ ! -f "$RAW_RUN" ]; then
    echo "[$LABEL] ERROR: $RAW_RUN not found" >&2
    return 1
  fi

  # 2. Must contain both testCases and schemaVersion
  if ! grep -q '"testCases"' "$RAW_RUN"; then
    echo "[$LABEL] ERROR: $RAW_RUN missing \"testCases\"" >&2
    return 1
  fi
  if ! grep -q '"schemaVersion"' "$RAW_RUN"; then
    echo "[$LABEL] ERROR: $RAW_RUN missing \"schemaVersion\"" >&2
    return 1
  fi

  # 3. Check minimum test case count (simple heuristic: count "status" keys)
  local COUNT
  COUNT=$(grep -c '"status"' "$RAW_RUN" 2>/dev/null || echo 0)
  if [ "$COUNT" -lt "$MIN_CASES" ]; then
    echo "[$LABEL] ERROR: expected at least $MIN_CASES test cases, found $COUNT" >&2
    return 1
  fi

  # 4. Check that at least one test case has story with scenario and steps
  if ! grep -q '"scenario"' "$RAW_RUN"; then
    echo "[$LABEL] ERROR: no \"scenario\" field found in $RAW_RUN" >&2
    return 1
  fi
  if ! grep -q '"keyword"' "$RAW_RUN"; then
    echo "[$LABEL] ERROR: no step \"keyword\" found in $RAW_RUN" >&2
    return 1
  fi

  echo "[$LABEL] ✓ raw-run.json structure looks good ($COUNT test cases)"

  # 5. Schema validation via formatters CLI (if built)
  if [ -f "$CLI" ]; then
    if node "$CLI" validate "$RAW_RUN"; then
      echo "[$LABEL] ✓ schema validation passed"
    else
      echo "[$LABEL] ERROR: schema validation failed" >&2
      return 1
    fi
  else
    echo "[$LABEL] ⚠ skipping schema validation (formatters CLI not built)"
  fi

  # 6. End-to-end formatter pipeline
  if [ -f "$CLI" ]; then
    local REPORT_DIR
    REPORT_DIR="$(dirname "$RAW_RUN")/reports"
    if node "$CLI" format "$RAW_RUN" --format html,markdown --output-dir "$REPORT_DIR" > /dev/null 2>&1; then
      local HTML_COUNT
      HTML_COUNT=$(find "$REPORT_DIR" -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
      local MD_COUNT
      MD_COUNT=$(find "$REPORT_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
      if [ "$HTML_COUNT" -gt 0 ] && [ "$MD_COUNT" -gt 0 ]; then
        echo "[$LABEL] ✓ formatter pipeline produced $HTML_COUNT HTML + $MD_COUNT Markdown files"
      else
        echo "[$LABEL] ERROR: formatter produced no output files" >&2
        return 1
      fi
    else
      echo "[$LABEL] ERROR: formatter pipeline failed" >&2
      return 1
    fi

    # 7. Verify all HTML themes produce valid output
    local THEMES="corporate terminal minimal dashboard playful"
    local THEME_FAIL=0
    for THEME in $THEMES; do
      local THEME_DIR="$REPORT_DIR/themes/$THEME"
      if node "$CLI" format "$RAW_RUN" --format html --html-theme "$THEME" --output-dir "$THEME_DIR" > /dev/null 2>&1; then
        local THEME_HTML_COUNT
        THEME_HTML_COUNT=$(find "$THEME_DIR" -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$THEME_HTML_COUNT" -gt 0 ]; then
          echo "[$LABEL] ✓ theme '$THEME' produced $THEME_HTML_COUNT HTML file(s)"
        else
          echo "[$LABEL] ERROR: theme '$THEME' produced no HTML output" >&2
          THEME_FAIL=1
        fi
      else
        echo "[$LABEL] ERROR: theme '$THEME' formatter failed" >&2
        THEME_FAIL=1
      fi
    done
    if [ "$THEME_FAIL" -ne 0 ]; then
      return 1
    fi
  fi

  echo "[$LABEL] OK: all checks passed"
  return 0
}
