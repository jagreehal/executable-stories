#!/usr/bin/env bash
# Verify executable-stories-ruby: run a sample Minitest story and assert raw-run.json.
# Run from repo root when Ruby and Bundler are available.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/packages/executable-stories-ruby"
RAW_RUN="$PKG/.executable-stories/raw-run.json"

# shellcheck source=lib/validate-raw-run.sh
source "$ROOT/scripts/lib/validate-raw-run.sh"

echo "[verify-ruby] Installing gems..."
cd "$PKG" && bundle install --quiet

TMPDIR="$(mktemp -d)"
SCRIPT="$TMPDIR/sample_story_test.rb"
trap 'rm -rf "$TMPDIR"' EXIT

cat > "$SCRIPT" << 'RUBY'
require "minitest/autorun"
require "executable_stories"
require "executable_stories/minitest"

class VerifyStoryTest < Minitest::Test
  def test_records_story
    story = ExecutableStories.init("user logs in successfully")
    story.given("a registered user")
    story.when("valid credentials are submitted")
    story.then("the dashboard is shown")
    story.record(status: "pass", source_file: __FILE__)
    assert true
  end
end
RUBY

mkdir -p "$(dirname "$RAW_RUN")"
rm -f "$RAW_RUN"

echo "[verify-ruby] Running sample Minitest story..."
cd "$PKG"
EXECUTABLE_STORIES_OUTPUT="$RAW_RUN" bundle exec ruby -Ilib "$SCRIPT"

validate_raw_run "$RAW_RUN" "verify-ruby"
