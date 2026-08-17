#!/usr/bin/env bash
set -euo pipefail

HTML_PATH="${REPORT_DIR}/${OUTPUT_NAME}.html"
MD_PATH="${REPORT_DIR}/${OUTPUT_NAME}.md"
MODE="${MODE:-report}"

echo "gate-failed=false" >> "${GITHUB_OUTPUT:-/dev/null}"

# ---------------------------------------------------------------------------
# Resolve the executable-stories binary into BINARY_PATH.
# Honours FORMATTER_BINARY (a prebuilt binary path) for dev/testing before a
# release exists; otherwise downloads the platform binary from GitHub Releases.
# ---------------------------------------------------------------------------
resolve_binary() {
  if [[ -n "${FORMATTER_BINARY:-}" ]]; then
    if [[ ! -f "$FORMATTER_BINARY" ]]; then
      echo "::error::formatter-binary set but not found: ${FORMATTER_BINARY}"
      exit 1
    fi
    chmod +x "$FORMATTER_BINARY"
    BINARY_PATH="$FORMATTER_BINARY"
    echo "::notice::Using provided formatter binary at ${FORMATTER_BINARY}"
    return
  fi

  # Determine platform binary name (tr for bash 3 compat on macOS)
  local OS ARCH BINARY REPO TAG DOWNLOAD_DIR
  OS=$(echo "$RUNNER_OS" | tr '[:upper:]' '[:lower:]')
  ARCH=$(echo "$RUNNER_ARCH" | tr '[:upper:]' '[:lower:]')

  case "$OS" in
    macos)  OS="darwin" ;;
    linux)  OS="linux" ;;
    windows) OS="windows" ;;
    *) echo "::error::Unsupported OS: ${RUNNER_OS}"; exit 1 ;;
  esac

  BINARY="executable-stories-${OS}-${ARCH}"
  [[ "$OS" == "windows" ]] && BINARY="${BINARY}.exe"

  REPO="jagreehal/executable-stories"
  if [[ "$FORMATTER_VERSION" == "latest" ]]; then
    TAG=$(gh release list --repo "$REPO" --limit 20 --json tagName --jq '[.[] | select(.tagName | startswith("executable-stories-formatters@"))][0].tagName')
    if [[ -z "$TAG" ]]; then
      echo "::error::Could not find a formatters release in ${REPO}. Ensure binaries are attached to releases."
      exit 1
    fi
  else
    TAG="executable-stories-formatters@${FORMATTER_VERSION}"
  fi

  echo "Downloading ${BINARY} from release ${TAG}..."
  DOWNLOAD_DIR=$(mktemp -d)
  gh release download "$TAG" \
    --repo "$REPO" \
    --pattern "$BINARY" \
    --dir "$DOWNLOAD_DIR"

  BINARY_PATH="${DOWNLOAD_DIR}/${BINARY}"
  chmod +x "$BINARY_PATH"
}

# ---------------------------------------------------------------------------
# MODE: report (default)
# ---------------------------------------------------------------------------
run_report() {
  # Path 1: Pre-generated reports exist
  if [[ -f "$HTML_PATH" && -f "$MD_PATH" ]]; then
    echo "::notice::Found pre-generated reports at ${REPORT_DIR}/"
    return
  fi

  # Path 2: Raw run JSON exists — download binary and format
  if [[ -f "$RAW_RUN" ]]; then
    echo "::notice::Found raw run JSON at ${RAW_RUN}, resolving formatter binary..."

    resolve_binary

    mkdir -p "$REPORT_DIR"
    "$BINARY_PATH" format "$RAW_RUN" \
      --format html,markdown \
      --output-dir "$REPORT_DIR" \
      --output-name "$OUTPUT_NAME"

    if [[ ! -f "$HTML_PATH" || ! -f "$MD_PATH" ]]; then
      echo "::error::Formatter ran but expected output files not found at ${HTML_PATH} and ${MD_PATH}"
      exit 1
    fi

    echo "::notice::Reports generated at ${REPORT_DIR}/"
    return
  fi

  # Neither found
  echo "::error::No reports found at ${HTML_PATH} and no raw run JSON at ${RAW_RUN}."
  echo "::error::Ensure your test runner generates executable-stories output."
  echo "::error::JS/TS: configure StoryReporter with outputDir/outputName. Non-JS: check .executable-stories/raw-run.json exists after tests."
  exit 1
}

# ---------------------------------------------------------------------------
# MODE: review — correlate a run JSON against the PR diff (Evidence Review)
# ---------------------------------------------------------------------------
run_review() {
  local RUN_JSON="${RUN_JSON:-}"
  [[ -z "$RUN_JSON" ]] && RUN_JSON="$RAW_RUN"
  if [[ ! -f "$RUN_JSON" ]]; then
    echo "::error::review mode needs a run JSON. Looked for '${RUN_JSON}'."
    echo "::error::Set run-json to your raw or canonical run output (JS reporters can emit raw-run.json; non-JS adapters write .executable-stories/raw-run.json)."
    exit 1
  fi

  # Resolve the changed-files context: use a precomputed file if given,
  # otherwise derive it from the diff against the base ref.
  local CF="${CHANGED_FILES:-}"
  if [[ -n "$CF" && -f "$CF" ]]; then
    echo "::notice::Using provided changed-files at ${CF}"
  else
    CF="$(mktemp)"
    local BR="${BASE_REF:-}"
    [[ -z "$BR" ]] && BR="${GITHUB_BASE_REF:-}"
    [[ -z "$BR" ]] && BR="main"
    echo "::notice::Computing changed files against '${BR}'..."
    git fetch --no-tags --depth=50 origin "$BR" >/dev/null 2>&1 || true
    if git rev-parse "origin/${BR}" >/dev/null 2>&1; then
      git diff --name-status "origin/${BR}...HEAD" > "$CF" 2>/dev/null \
        || git diff --name-status "origin/${BR}" HEAD > "$CF" 2>/dev/null \
        || : > "$CF"
    else
      git diff --name-status "${BR}...HEAD" > "$CF" 2>/dev/null || : > "$CF"
    fi
  fi

  resolve_binary

  mkdir -p "$REPORT_DIR"

  # Build optional gate flags
  local GATE_ARGS=()
  [[ -n "${FAIL_ON:-}" ]] && GATE_ARGS+=(--fail-on "$FAIL_ON")
  [[ -n "${MIN_EVIDENCE:-}" ]] && GATE_ARGS+=(--min-evidence "$MIN_EVIDENCE")

  # The review report is written before any gate is evaluated, so even when the
  # gate fails (exit 5) the report exists for the comment/artifact steps. We
  # capture the gate result and enforce it in a later step so the comment posts.
  set +e
  "$BINARY_PATH" review "$RUN_JSON" \
    --changed-files "$CF" \
    ${BASE_REF:+--base-ref "$BASE_REF"} \
    --output-dir "$REPORT_DIR" \
    --output-name "$OUTPUT_NAME" \
    ${GATE_ARGS[@]+"${GATE_ARGS[@]}"}
  local CODE=$?
  set -e

  if [[ "$CODE" -eq 5 ]]; then
    echo "gate-failed=true" >> "$GITHUB_OUTPUT"
    echo "::warning::Evidence Review gate failed; report generated, gate enforced after comment."
  elif [[ "$CODE" -ne 0 ]]; then
    echo "::error::review failed with exit code ${CODE}"
    exit "$CODE"
  fi

  if [[ ! -f "$HTML_PATH" || ! -f "$MD_PATH" ]]; then
    echo "::error::review ran but expected output files not found at ${HTML_PATH} and ${MD_PATH}"
    exit 1
  fi

  echo "::notice::Evidence Review generated at ${REPORT_DIR}/"
}

# ---------------------------------------------------------------------------
# MODE: gate-release
# ---------------------------------------------------------------------------
run_gate_release() {
  local DEV_RUN="${GATE_DEV_RUN:-}"
  if [[ -z "$DEV_RUN" ]]; then
    echo "::error::gate-release mode requires gate-dev-run (path to dev environment test run)"
    exit 1
  fi

  if [[ ! -f "$DEV_RUN" ]]; then
    echo "::error::Dev run file not found: ${DEV_RUN}"
    exit 1
  fi

  if [[ ! -f "$RAW_RUN" ]]; then
    echo "::error::RC run file not found: ${RAW_RUN}"
    exit 1
  fi

  resolve_binary

  # Build gate-release flags
  local FLAGS=(--format html,markdown --output-dir "$REPORT_DIR" --output-name "$OUTPUT_NAME")

  GATE_FAIL_ON_REGRESSION="${GATE_FAIL_ON_REGRESSION:-true}"
  GATE_FAIL_ON_REMOVAL="${GATE_FAIL_ON_REMOVAL:-true}"
  GATE_FAIL_ON_NEW="${GATE_FAIL_ON_NEW:-false}"

  # Gate-release subcommand enables --fail-on-regression and --fail-on-removal by default,
  # but we also support explicit overrides via inputs.

  if [[ "$GATE_FAIL_ON_REGRESSION" == "false" ]]; then
    # gate-release enables regression check by default; no way to disable yet except via policy
    echo "::warning::gate-fail-on-regression=false — regression check is always on in gate-release"
  fi
  if [[ "$GATE_FAIL_ON_REMOVAL" == "false" ]]; then
    echo "::warning::gate-fail-on-removal=false — removal check is always on in gate-release"
  fi
  if [[ "$GATE_FAIL_ON_NEW" == "true" ]]; then
    FLAGS+=(--fail-on-new)
  fi

  if [[ -n "${GATE_RELEASE_POLICY:-}" ]] && [[ -f "$GATE_RELEASE_POLICY" ]]; then
    FLAGS+=(--release-policy "$GATE_RELEASE_POLICY")
  fi

  echo "::group::Running release gate: dev=${DEV_RUN} rc=${RAW_RUN}"
  set +e
  "$BINARY_PATH" gate-release "$DEV_RUN" "$RAW_RUN" "${FLAGS[@]}"
  local EXIT_CODE=$?
  set -e
  echo "::endgroup::"

  if [[ $EXIT_CODE -eq 6 ]]; then
    echo "gate-failed=true" >> "$GITHUB_OUTPUT"
    echo "::error::Release gate failed. RC does not match dev baseline."
  elif [[ $EXIT_CODE -ne 0 ]]; then
    echo "::error::gate-release command failed with exit code ${EXIT_CODE}"
    exit $EXIT_CODE
  else
    echo "gate-failed=false" >> "$GITHUB_OUTPUT"
    echo "::notice::Release gate passed. RC matches dev baseline."
  fi
}

# ---------------------------------------------------------------------------
# MODE: deploy
# ---------------------------------------------------------------------------
run_deploy() {
  local ENV="${DEPLOY_ENV:-}"
  if [[ -z "$ENV" ]]; then
    echo "::error::deploy mode requires deploy-env (environment name)"
    exit 1
  fi

  if [[ ! -f "$RAW_RUN" ]]; then
    echo "::error::Raw run file not found: ${RAW_RUN}"
    exit 1
  fi

  resolve_binary

  local FLAGS=(--env "$ENV")
  if [[ -n "${DEPLOY_TAG:-}" ]]; then
    FLAGS+=(--tag "$DEPLOY_TAG")
  fi
  local LEDGER="${DEPLOY_LEDGER:-.executable-stories/deployments.json}"
  FLAGS+=(--ledger "$LEDGER")

  echo "::group::Recording deployment to ${ENV}"
  "$BINARY_PATH" deploy record "$RAW_RUN" "${FLAGS[@]}"
  echo "::endgroup::"

  echo "::notice::Deployment to ${ENV} recorded in ${LEDGER}"
  echo "deploy-ledger-path=${LEDGER}" >> "$GITHUB_OUTPUT"
  echo "::notice::Persist ${LEDGER} as an artifact, cache, or committed file if later jobs should compare environments."

  # Also show current status
  echo "::group::Deployment status"
  "$BINARY_PATH" deploy status --ledger "$LEDGER" || true
  echo "::endgroup::"
}

# ---------------------------------------------------------------------------
# MODE: publish-run — validate the run JSON and hand its path to the publish
# step in action.yml, which commits it to the runs branch via the Git Data API.
# No binary needed: the raw run JSON is published as-is (it is what the
# executable-stories-astro loader consumes).
# ---------------------------------------------------------------------------
run_publish() {
  local SOURCE="${RUN_JSON:-}"
  [[ -z "$SOURCE" ]] && SOURCE="$RAW_RUN"
  if [[ ! -f "$SOURCE" ]]; then
    echo "::error::publish-run mode needs a run JSON. Looked for '${SOURCE}'."
    echo "::error::Set run-json (or raw-run) to your test run output. JS reporters can emit raw-run.json; non-JS adapters write .executable-stories/raw-run.json."
    exit 1
  fi
  # Gate on the file actually being a run JSON. Validate the structural fields
  # the raw -> canonical transform dereferences so a payload accepted here
  # cannot later crash an executable-stories-astro loader. This deliberately
  # accepts both permissive raw runs and strict canonical runs; it is not a
  # second versioned schema. Node is available on every Actions runner that can
  # execute this composite action, so validation has no optional dependency or
  # bypass path.
  if ! node -e '
    const fs = require("fs");
    const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const record = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
    const strings = (v) => Array.isArray(v) && v.every((item) => typeof item === "string");
    const optionalStrings = (v) => v === undefined || strings(v);
    const validStep = (step) => record(step) && typeof step.keyword === "string" && typeof step.text === "string";
    const validTicket = (ticket) =>
      typeof ticket === "string" || (record(ticket) && typeof ticket.id === "string");
    const validAttachment = (attachment) =>
      record(attachment) &&
      typeof attachment.name === "string" &&
      typeof attachment.mediaType === "string" &&
      (attachment.path === undefined || typeof attachment.path === "string") &&
      (attachment.body === undefined || typeof attachment.body === "string");
    const validStory = (story) =>
      story === undefined ||
      (record(story) &&
        (story.scenario === undefined || typeof story.scenario === "string") &&
        (story.steps === undefined || (Array.isArray(story.steps) && story.steps.every(validStep))) &&
        optionalStrings(story.tags) &&
        optionalStrings(story.suitePath) &&
        (story.tickets === undefined || (Array.isArray(story.tickets) && story.tickets.every(validTicket))));
    const validCase = (testCase) =>
      record(testCase) &&
      typeof testCase.status === "string" &&
      validStory(testCase.story) &&
      optionalStrings(testCase.titlePath) &&
      (testCase.attachments === undefined ||
        (Array.isArray(testCase.attachments) && testCase.attachments.every(validAttachment))) &&
      (testCase.stepEvents === undefined ||
        (Array.isArray(testCase.stepEvents) && testCase.stepEvents.every(record)));
    if (!record(d) || !Array.isArray(d.testCases) || !d.testCases.every(validCase)) process.exit(1);
  ' "$SOURCE" >/dev/null 2>&1; then
    echo "::error::publish-run: '${SOURCE}' is not a structurally valid raw/canonical run JSON."
    echo "::error::Refusing to publish — downstream docs hubs fetch this file at build time."
    exit 1
  fi
  echo "::notice::Publishing ${SOURCE} to the runs branch..."
  echo "publish-source=${SOURCE}" >> "$GITHUB_OUTPUT"
}

# ---------------------------------------------------------------------------
# MODE: ingest — push the run's StoryReport to a cloud ingest endpoint.
# The free action stays file-based and stateless; this mode only runs when an
# api-key is provided (the open-core line: persistence lives in the cloud).
# ---------------------------------------------------------------------------
run_ingest() {
  if [[ -z "${API_KEY:-}" ]]; then
    echo "::error::ingest mode needs api-key. Create one in your cloud instance's settings (Ingest key) and store it as a secret."
    exit 1
  fi

  resolve_binary

  # Use a pre-generated StoryReport if present; otherwise format the raw run.
  local STORY_REPORT="${REPORT_DIR}/${OUTPUT_NAME}.story-report.json"
  if [[ ! -f "$STORY_REPORT" ]]; then
    if [[ ! -f "$RAW_RUN" ]]; then
      echo "::error::ingest mode needs ${STORY_REPORT} or a raw run JSON at ${RAW_RUN}."
      exit 1
    fi
    mkdir -p "$REPORT_DIR"
    "$BINARY_PATH" format "$RAW_RUN" \
      --format story-report-json \
      --output-dir "$REPORT_DIR" \
      --output-name "$OUTPUT_NAME"
    if [[ ! -f "$STORY_REPORT" ]]; then
      echo "::error::Formatter ran but ${STORY_REPORT} was not produced."
      exit 1
    fi
  fi

  # The CLI owns the wire contract: it reads repo/branch/sha, the base commit,
  # and PR metadata from the Actions environment, writes the run URL and the
  # recommended scope to the job summary, and appends ingest-run-id to
  # GITHUB_OUTPUT. Duplicating any of that here is how the two drift apart.
  local PUSH_ARGS=(push "$STORY_REPORT" --url "$INGEST_URL")
  [[ "${INGEST_GATE:-}" == "true" ]] && PUSH_ARGS+=(--gate)

  # Capture the exit code explicitly: the gate reports its verdict with a
  # distinct code, and `set -e` would kill the step before we can name it.
  set +e
  EXECUTABLE_STORIES_API_KEY="$API_KEY" "$BINARY_PATH" "${PUSH_ARGS[@]}"
  local STATUS=$?
  set -e

  case "$STATUS" in
    0) echo "::notice::Run ingested to ${INGEST_URL}" ;;
    5) echo "::error::Release gate blocked this commit — see the job summary for the reasons."
       exit 1 ;;
    4) echo "::error::The formatter binary rejected these options. formatter-version is pinned to '${FORMATTER_VERSION}', which predates them — use 'latest' or a newer version."
       exit 1 ;;
    *) echo "::error::Ingest failed — check api-key, ingest-url, and that the cloud instance is reachable."
       exit 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Main dispatch
#
# Living-docs sites are no longer built here. They come from a committed Astro
# project: scaffold once with `executable-stories init-astro`, point it at your
# run JSON, and deploy with `astro build` in your own workflow. See the
# "Living documentation" section of the README.
# ---------------------------------------------------------------------------
case "$MODE" in
  report)
    run_report
    ;;
  review)
    run_review
    ;;
  gate-release)
    run_gate_release
    ;;
  deploy)
    run_deploy
    ;;
  publish-run)
    run_publish
    ;;
  ingest)
    run_ingest
    ;;
  *)
    echo "::error::Unknown mode: ${MODE}. Supported: report, review, gate-release, deploy, publish-run, ingest."
    echo "::error::For a living-docs site, scaffold with 'executable-stories init-astro' and deploy with 'astro build' (see the action README)."
    exit 1
    ;;
esac
