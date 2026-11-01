---
name: linear-evidence-review
description: Post Evidence Review receipts to linked Linear issues over MCP.
disable-model-invocation: true
---

# Linear Evidence Review

Use this skill for the **interactive agent convenience path**: an IDE/CLI agent reads an executable-stories review, finds linked Linear issues, and posts or updates a short receipt through Linear MCP.

For CI, use the `executable-stories-linear` package instead: `npx executable-stories-linear publish reports/raw-run.json` with `LINEAR_API_KEY` keeps one Quality checks attachment per issue per scope, updated in place every run. This skill covers the interactive case, where Linear MCP signs in through OAuth.

- The executable-stories report is the source of truth.
- Linear issues are provenance and workflow records.
- This skill uses Linear MCP only. For headless posting from CI, point the user at `executable-stories-linear`.
- This is the Linear-specific path. For Jira, GitHub Issues, or any other tracker with an MCP server, use `tracker-receipts`, which generalises this workflow.
- Do not rename tests after tickets. Behaviour/domain file names preserve review correlation, e.g. `src/checkout/regional-routing.story.test.ts` can correlate to `src/checkout/regional-routing.ts`; `LIN-123.test.ts` cannot.

## Prerequisites

This skill is **agent-agnostic**: it only needs a **Linear MCP server** connected in whatever agent you run. The remote endpoint is `https://mcp.linear.app/mcp`; first use triggers an interactive OAuth login. Once a Linear MCP tool is available, the workflow below is identical across agents.

```sh
# Claude Code (primary)
claude mcp add --transport http linear https://mcp.linear.app/mcp

# Codex
codex mcp add linear --url https://mcp.linear.app/mcp
# if remote MCP needs enabling: edit ~/.codex/config.toml, then: codex mcp login linear
```

For any other MCP-capable client (Cursor, VS Code, Windsurf, Gemini CLI, …), add the remote server `https://mcp.linear.app/mcp` through that client's MCP configuration and complete the OAuth prompt. The rest of this skill does not depend on which agent is used.

## Workflow

1. Generate or inspect the Evidence Review output.
   - Prefer existing review artifacts if present.
   - Otherwise run the project's normal test/report command, then `executable-stories review`.
2. Read ticket provenance from the canonical report model: `testCase.story.tickets`.
   - Each ticket is a normalized `{ id, url? }` reference.
   - Do not invent a new ticket field.
3. Identify Linear tickets, then fetch those issues through Linear MCP.
   - Treat a ticket as Linear when `ticket.url` has host `linear.app`.
   - Do not infer from `LIN-123` style IDs; team keys are not reliable. If a ticket has no URL and is ambiguous, ask.
   - If an issue is missing or inaccessible, report it and continue with the rest.
4. Build a short receipt.
   - Scope each issue receipt to claims whose `testCase.story.tickets` include that issue.
   - Include verified behaviours, evidence strength, uncovered/weak counts, and the report link or artifact path.
   - Mention that the report is authoritative.
5. Confirm before writing.
   - Show target issues and planned receipt text.
   - Proceed only after the user approves, unless the user already explicitly said to post/update Linear.
6. Update Linear idempotently.
   - Search the issue comments for the marker below.
   - If found, update that comment in place.
   - If not found, create one comment.

Use one stable marker per issue and PR/head ref:

```md
<!-- executable-stories:evidence-review issue=LIN-123 ref=<branch-or-pr> -->
```

Use PR number when available, otherwise the branch name. Never use commit SHA: it changes on every push and breaks idempotency. Never create a second receipt with the same marker.

Use `✅` only when all claims linked to that issue passed with moderate or strong evidence and no linked changed source is uncovered. Use `⚠️` if any linked claim failed, has weak/none evidence, or has uncovered changed source.

## Receipt Shape

Keep the comment concise:

```md
<!-- executable-stories:evidence-review issue=LIN-123 ref=PR-42 -->
✅ Executable Stories evidence receipt

Verified behaviours:
- Checkout selects the right regional payment route — strong evidence
- Currency fallback keeps the existing checkout total — weak evidence

Authoritative report: <link-or-path>

Note: this Linear issue is provenance. The executable report remains the source of truth.
```

Do not paste the full report into Linear.

## What Not To Do

- Do not copy the whole report into Linear.
- Do not post to issues without showing the plan first, unless the user already explicitly said to post.
- Do not close or move issues unless the user explicitly asks.
- Do not create CI automation or API scripts from this skill.
- Do not create new issues for every warning unless requested.
- Do not treat Linear titles/descriptions as requirements truth.
- Do not use ticket-named test files as a convention.
