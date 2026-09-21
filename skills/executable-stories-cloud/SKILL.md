---
name: executable-stories-cloud
description: Use when a team wants its test results on one page for everyone — pushing a run to Executable Stories Cloud from any framework, asking whether a commit is safe to release, or exporting and restoring an organisation's data. Triggers include "push my test results", "is this safe to release", "did the gate pass", "export our test data". Needs an ES_KEY; without one, stay with the local reports.
---

# Executable Stories Cloud

The hosted control room for behaviours: every push lands as a run on a named
commit, manual cases and code-derived stories share one catalogue, and a
release carries an auditable decision. This skill covers the three things an
agent does against it directly. Connecting an agent over MCP is
`cloud-mcp`; migrating cases in is `cloud-migrate`; wiring PR-time scope
and gates is `cloud-change-aware-testing`.

## Setup

```
EXECUTABLE_STORIES_API_KEY=es_...   # Settings → API keys
EXECUTABLE_STORIES_URL=https://app.executablestories.com
```

Keys carry scopes: `read`, `ingest`, `write:results`, `write:cases`,
`write:releases`. A 403 naming a scope means the key lacks it; tell the user
which one to add rather than retrying.

## Push a run (no test changes)

Prefer the CLI. It detects the format from the file, infers repo, branch
and SHA from git, and under GitHub Actions needs no flags at all:

```bash
npx --package executable-stories-formatters executable-stories push reports/raw-run.json
executable-stories push junit.xml                       # any JUnit producer
executable-stories push playwright-report.json          # --reporter=json
executable-stories push allure-results/                 # *-result.json collected
```

Useful flags: `--title <text>`, `--env <name>` (filterable as `env == …`),
`--description <text|@file.md>` (Markdown shown above the results, so an
agent's analysis travels with the run), `--base <ref>` (attach the changed
files; see `cloud-change-aware-testing`), `--force` (a failed upload does not
fail the build). Repo, branch and SHA are overridable with `--repo`,
`--branch`, `--git-sha`.

Raw HTTP, when a CLI is not an option:

```bash
curl -sS -X POST "$EXECUTABLE_STORIES_URL/api/v1/runs/junit?repo=acme/api&branch=main&sha=$(git rev-parse HEAD)" \
  -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY" -H "Content-Type: application/xml" \
  --data-binary @junit.xml
```

`/api/v1/runs` takes a StoryReport v1 envelope, `/runs/junit` JUnit XML,
`/runs/playwright` Playwright's JSON reporter, `/runs/allure` a JSON array of
`allure-results/*-result.json`. Query parameters: `repo` (required),
`branch`, `sha`, `projectRoot`, `changedFiles`. The OpenAPI document is at
`/api/v1/openapi.json` and rendered at `/docs/api`.

Every push returns `{ runId, url, scenarios, recommendations }`. **Show the
user the `url`**: it is the run they just created. `recommendations` names
what is worth running for the change, with reasons; relay the reasons, not
just the list. A `422` says how the file was malformed; report it verbatim
and do not retry the same body.

A pushed run is an event, not a snapshot of the whole suite. A run from a
filtered test command carries only the files it ran, and the cloud treats a
scenario as gone only when its source file was in that set.

## Is this safe to release?

```bash
executable-stories push reports/raw-run.json --gate      # exits 5 when blocked, naming each reason
curl -sS "$EXECUTABLE_STORIES_URL/api/v1/releases/gate?repo=acme/api&sha=$SHA" \
  -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY"
```

Returns `{ status, blocking[], warnings[] }`, or `status: "no-release"` when
no release covers that commit, which is neither a failure nor permission to
ship: say there is nothing to gate on. The checks are deterministic, so their
reasons are quotable. When something blocks, name *which* check and *why*;
never summarise a blocked gate as "some tests failed". An unreachable gate
fails rather than passes.

## Export and restore

```bash
curl -sS "$EXECUTABLE_STORIES_URL/api/v1/export" -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY" > export.json
curl -sS "$EXECUTABLE_STORIES_URL/api/v1/export?table=behaviour&format=csv" -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY"
curl -sS "$EXECUTABLE_STORIES_URL/api/v1/export?table=behaviour&format=markdown" -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY"
```

`/api/v1/export` returns every row the organisation owns. Restore reads it
back into an **empty** organisation only:

```bash
curl -sS -X POST "$EXECUTABLE_STORIES_URL/api/v1/restore" -H "Authorization: Bearer $EXECUTABLE_STORIES_API_KEY" \
  -H "Content-Type: application/json" --data-binary @export.json
```

A `403` here means the target already holds data. That is the safety rule: a
restore is a migration, never a merge. If the user wants to merge, they want
`cloud-migrate`.

## Rules

- **Never invent a verdict.** No release for a commit means no verdict.
- **Never call a skipped test a pass**, in any summary you write.
- **Relay reasons.** Gate results and recommendations both carry them.
- A `429` carries `Retry-After`. Wait it out; do not tighten the loop.
