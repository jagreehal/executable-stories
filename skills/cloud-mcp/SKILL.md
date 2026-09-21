---
name: cloud-mcp
description: Use when connecting a coding agent (Claude Code, Cursor, Codex, any MCP client) to Executable Stories Cloud, or when an agent needs to answer from it — which behaviours exist, what failed last, what is flaky, is this release ready — with the ESQ query language and the nineteen MCP tools. Triggers include "connect to Executable Stories over MCP", "what does the suite prove", "which stories are failing", "set up the read-only MCP profile".
---

# Executable Stories Cloud over MCP

`POST /api/mcp`, streamable HTTP. One server, three ways in:

| Auth | Use it when |
| --- | --- |
| API key (`Authorization: Bearer es_…`) | CI, scripts, one org, no browser |
| OAuth | a person's agent; scopes follow their role, sessions are revocable |
| `?tools=read` (or `X-MCP-Tools: read`) | a review session that must observe and never write |

## Connect

API key:

```json
{
  "mcpServers": {
    "executable-stories": {
      "type": "http",
      "url": "https://app.executablestories.com/api/mcp",
      "headers": { "Authorization": "Bearer es_..." }
    }
  }
}
```

OAuth: give the client the URL with no header. The first call returns a
401 with an RFC 9728 challenge; the client discovers
`/.well-known/oauth-protected-resource`, registers itself (dynamic client
registration), sends the person to sign in and consent, and exchanges a PKCE
code for a token. Nothing to configure server-side. Tokens map to the
person's active organisation and their role's scopes.

Health and transport metadata: `GET /api/mcp/health`. Every write an agent
makes carries the session id (`X-MCP-Session`) into the audit trail, kept
separate from what a person confirmed.

## First calls

1. `list_capabilities`: what this key or token may do. Call it when unsure.
2. `query_help`: the ESQ fields for behaviours and runs.

## Tools

Read (`read` scope): `list_behaviours`, `get_behaviour`, `list_runs`,
`list_manual_runs`, `get_manual_run`, `list_releases`, `get_release`,
`get_coverage_summary`, `get_analytics`, `get_eval_summary`,
`list_saved_queries`, `list_comments`, `query_help`, `list_capabilities`.

Write: `add_comment` (`write:cases`), `record_manual_result` and
`record_eval_result` (`write:results`), `create_release` and
`record_release_decision` (`write:releases`).

`get_behaviour` returns the versions, the last executions with the run behind
each, the pass rate and the latest failure: one call answers "is this covered
and does it pass". `get_analytics` returns flaky, slowest, ever-failing,
never-run, failure clusters, and per-tag and per-environment tallies.

## ESQ, the query language

`list_behaviours` and `list_runs` take `query`. Bare text searches titles;
anything with an operator is a query.

```
tag == smoke and status != passed
tag in [smoke, regression] and not status == passed
priority >= high and source == manual
repo == acme/api and failed > 0 and created > 2026-09-01
sha ~ 3e7d      # prefix match
```

Behaviour fields: `title`, `id`, `section`, `tag`, `source` (code | manual),
`status` (passed, failed, skipped, pending), `priority` (low, normal, high,
critical), `file`, `repo`, `updated`, `created`. Run fields: `repo`,
`title`, `env`, `branch`, `sha`, `source`, `passed`, `failed`, `total`,
`created`, `pinned`. Operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `~`, `in`,
`and`, `or`, `not`.

A malformed query does not error: the server falls back to a text search and
returns the parse reason. Read the reason back to the user; do not guess a
fix. Saved queries (`list_saved_queries`) are org-wide and re-parsed on use.

## Recording results as an agent

`record_manual_result` and `record_eval_result` **append** an execution; they
never amend one. You cannot rewrite a past result, and you should not try.
Ready, blocked and released decisions (`record_release_decision`) require an
explicit note. Record what you observed and let a person confirm it.

## Rules

- Answer from the catalogue and runs, never from source. A claim needs a
  behaviour id behind it; otherwise say "not covered by a story".
- Never call a skipped result a pass.
- Prefer `?tools=read` for review and triage sessions; fewer schemas, and no
  way to write by accident.
