#!/usr/bin/env bash
# Verify executable-stories-ruby example app: run the Minitest stories, assert raw-run.json.
# Run from repo root when Ruby 3.1+ and Bundler are available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/ruby-example"
RAW_RUN="$APP/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-ruby] Installing gems..."
cd "$APP" && bundle install --quiet

rm -f "$RAW_RUN"

echo "[verify-ruby] Running ruby-example stories..."
bundle exec rake test

validate_raw_run "$RAW_RUN" "verify-ruby"
