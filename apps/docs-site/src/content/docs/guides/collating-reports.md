---
title: Collating reports
description: Merging JSON or Markdown reports into a single index
---

When you enable **`includeJson`** in the reporter (or use **`includeFrontMatter: true`** for Markdown), each run can write JSON files or Markdown with front-matter. **Collating** means merging those files into a **single index** (e.g. one JSON manifest) for dashboards, CI, or tooling.

## Current options

A dedicated **collate CLI** (e.g. `executable-stories-jest collate`, `executable-stories-vitest collate`) is **not** currently provided by the framework packages or the formatters package. To build a combined index today you can:

1. **Programmatic merge**: Use the reporter’s JSON output (or Markdown with front-matter) and write a small script that:
   - Globs the report files (e.g. `docs/**/*.json` or `**/*.docs.json`).
   - Reads and parses each file.
   - Merges metadata (e.g. scenario lists, file paths, timestamps) into a single JSON structure and writes it to a file (e.g. `docs/story-index.json`).

2. **Formatters**: If you generate reports via [executable-stories-formatters](/reference/formatters-api/) (e.g. in CI), you already get aggregated or colocated output per run. For multi-project or multi-run aggregation, combine the formatters’ output (e.g. multiple `TestRunResult` or raw JSON files) in your own script and optionally produce a single index file.

## When collating is useful

- **Dashboards**: One index of all scenarios and metadata across files or runs.
- **CI**: Aggregate reports from multiple projects or workspaces into a single artifact.
- **Tooling**: Scripts that need a single JSON manifest of all story reports.

If you only use colocated Markdown and don’t need a combined index, you can skip this step.

## CI shards → one cloud run

A sharded suite (`--shard=1/4` in Playwright, a matrix job per package, a split by tag) produces one raw run per shard. Pushing each shard to the cloud as its own run would make every shard look like a mass deletion of the scenarios it did not execute. Aggregate first, then push once:

```yaml
jobs:
  test:
    strategy:
      fail-fast: false # one red shard must not cancel the others, or the run is partial
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      # Every shard's reporter writes reports/by-file/<file>.story-report.json.
      # Playwright can split one source file across shards, so two shards may
      # write the same filename with different scenarios in it. Stamp the shard
      # into the name and the aggregate step merges them instead of one
      # overwriting the other.
      - if: ${{ !cancelled() }} # failed tests are the runs most worth reporting
        run: |
          for f in reports/by-file/*.json; do
            mv "$f" "${f%.json}.shard-${{ matrix.shard }}.json"
          done
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: story-reports-${{ matrix.shard }}
          path: reports/by-file

  report:
    needs: test
    if: ${{ !cancelled() }} # a red test job still needs its report pushed
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: story-reports-*
          path: reports/by-file
          merge-multiple: true
      # download-artifact fetches whatever matches the pattern. A shard that
      # crashed before its reporter ran uploads nothing, and the rest would be
      # pushed as the whole suite, retiring every scenario that shard owned.
      # Count the shard stamps and refuse to push a partial picture.
      - run: |
          shards=$(ls reports/by-file/*.shard-*.json | sed 's/.*\.shard-\([0-9]*\)\.json$/\1/' | sort -u | wc -l)
          test "$shards" -eq 4 || { echo "Only $shards of 4 shards reported; not pushing a partial run."; exit 1; }
      - run: |
          npx executable-stories format reports/by-file \
            --format story-report-json --output-dir reports --output-name index
          npx executable-stories push reports/index.story-report.json \
            --title "CI ${{ github.run_number }}" --env ci
        env:
          EXECUTABLE_STORIES_API_KEY: ${{ secrets.EXECUTABLE_STORIES_API_KEY }}
```

`format reports/by-file` merges every report in the directory into one StoryReport: scenarios are keyed by id and features by source file, so two shard reports for the same file combine rather than collide, and the `features[].sourceFile` set is the whole suite. `push` sends that one run. The cloud then computes the diff against the previous run, notifies the channels the org configured, and updates the catalogue from a complete picture. No server-side "shared run" mode is needed: the aggregation already happens where the files are.
