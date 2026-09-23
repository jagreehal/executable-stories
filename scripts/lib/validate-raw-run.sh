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

    # 7. Agent artifacts: StoryReport, scenario index, behavior manifest
    if node "$CLI" format "$RAW_RUN" --format story-report-json,scenario-index-json,behavior-manifest-json --output-dir "$REPORT_DIR" --output-name index > /dev/null 2>&1; then
      if [ -f "$REPORT_DIR/index.story-report.json" ]; then
        echo "[$LABEL] ✓ story-report-json generated"
      else
        echo "[$LABEL] ERROR: story-report-json missing at $REPORT_DIR/index.story-report.json" >&2
        return 1
      fi
    else
      echo "[$LABEL] ERROR: agent artifact format failed" >&2
      return 1
    fi

    if node "$CLI" list "$RAW_RUN" --list-format json > /dev/null 2>&1; then
      echo "[$LABEL] ✓ list --list-format json succeeded"
    else
      echo "[$LABEL] ERROR: list --list-format json failed" >&2
      return 1
    fi

    if [ -f "$REPORT_DIR/index.scenario-index.json" ] && [ -f "$REPORT_DIR/index.behavior-manifest.json" ]; then
      echo "[$LABEL] ✓ scenario-index-json and behavior-manifest-json generated"
    else
      echo "[$LABEL] ERROR: missing index.scenario-index.json or index.behavior-manifest.json" >&2
      return 1
    fi

    # Inline attachments: each example app attaches division-rules.md, and it
    # must reach the StoryReport as content so the HTML report can preview it.
    if ! node -e '
      const report = require(process.argv[1]);
      const found = [];
      (function walk(v) {
        if (Array.isArray(v)) return v.forEach(walk);
        if (!v || typeof v !== "object") return;
        if (v.mediaType === "text/markdown" && v.name === "division-rules.md") found.push(v);
        Object.values(v).forEach(walk);
      })(report);
      const att = found[0];
      if (!att) throw new Error("no division-rules.md markdown attachment in the StoryReport");
      if (att.external) throw new Error("division-rules.md arrived as a reference, not content");
      const text = att.contentEncoding === "BASE64" ? Buffer.from(att.body, "base64").toString("utf8") : att.body;
      if (!text.includes("## Division rules")) throw new Error("division-rules.md body is not the attached markdown: " + text);
    ' "$REPORT_DIR/index.story-report.json"; then
      echo "[$LABEL] ERROR: inline markdown attachment did not reach the StoryReport" >&2
      return 1
    fi
    echo "[$LABEL] ✓ inline markdown attachment reached the StoryReport"
  fi

  # Planned scenarios: every adapter must be able to emit status "todo" so a
  # plan renders the same way in every language. Each example app declares one.
  if ! grep -q '"todo"' "$RAW_RUN"; then
    echo "[$LABEL] ERROR: no planned scenario (status \"todo\") in $RAW_RUN" >&2
    return 1
  fi
  echo "[$LABEL] ✓ planned scenario emitted"

  echo "[$LABEL] OK: all checks passed"
  return 0
}
