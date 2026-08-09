---
name: ci-gates
description: Use when wiring executable-stories into CI or deciding which checks should block a merge or a release. Chooses the right gate for each stage, explains what each exit code means, and keeps the pipeline honest without turning it into a wall of red that everyone learns to override.
---

# CI Gates

A gate that fires on things nobody can act on gets disabled within a fortnight, and the
one useful check disappears with it. So the design question is never "what could we
check", it is "what should stop a merge, and what should merely be visible".

Three stages, three different answers.

## Agent guardrails

- **Do not enable every gate at once.** Add one, watch it for a week, then add the next.
  A pipeline that goes red for four unrelated reasons on day one teaches the team that
  red is meaningless.
- **A gate that cannot be satisfied is a bug in the gate.** If `--fail-on-regression`
  fires on a sharded run, the fix is `--partial`, not "developers pass `--no-fail`".
- **Never let CI edit scenarios to go green.** Autofix has no business here.
- **Publish artifacts even when the gate fails.** The report is most valuable exactly
  when the run is red.

## Exit codes

Every gate uses the same table, so a pipeline can branch on the number:

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Schema validation failure |
| 2 | Canonical validation failure |
| 3 | Formatter or generation failure |
| 4 | Bad arguments or usage |
| 5 | `compare` / `review` / `check` / `check-explainers` / `goal` gate failed |
| 6 | Release gate failed |

## Stage 1: every pull request

Run the suite, generate artifacts, then gate. Start with these two and nothing else.

```bash
pnpm test
executable-stories format reports/raw-run.json --preset ci --output-dir reports --output-name index

# blocks: any scenario failing
executable-stories check reports/raw-run.json --baseline auto

# blocks: a scenario that used to pass now fails, or one disappeared
executable-stories compare baseline/raw-run.json reports/raw-run.json \
  --fail-on-regression --fail-on-removal --pr-summary-file pr-summary.md
```

`--fail-on-removal` is the one people skip and the one that matters. Without it, the
cheapest way past a failing gate is to delete the scenario, and every incentive in a
hurried pipeline points that way.

Post `pr-summary.md` as the PR comment. A reviewer who can see "2 scenarios changed
behaviour, 1 removed" reviews a different diff than one who sees only files.

Add these when the repo is ready for them, one at a time:

```bash
# blocks: changed code with no scenario behind it (AI-authored changes especially)
executable-stories review reports/raw-run.json \
  --changed-files changed.json --fail-on uncovered --min-evidence moderate

# blocks: an explainer citing a scenario that changed, was renamed, or vanished
executable-stories check-explainers reports/raw-run.json --explainers-dir story-docs/src/content/docs/explainers

# blocks: broken links in the docs site
executable-stories check-links story-docs/src/content/docs
```

`review` needs the changed-file list, from `git diff --name-status` text or a JSON
`ChangedFile[]`. Start it at `--fail-on uncovered` (no evidence at all) before tightening
to `weak`.

### Sharded or filtered pipelines

```bash
executable-stories compare baseline.json shard-run.json --partial --fail-on-regression
```

`--partial` tells compare the current run only covers some files, so untouched baseline
scenarios count as not-run rather than removed. Every sharded pipeline needs this, and
every sharded pipeline without it has a permanently ignored gate.

## Stage 2: the release candidate

```bash
executable-stories gate-release dev-run.json rc-run.json --release-policy policy.json
```

This asks a narrower question than the PR gate: does the release candidate still do what
the dev environment was tested doing? `--fail-on-regression` and `--fail-on-removal` are
on by default here, and it exits 6 rather than 5 so the pipeline can tell a release
failure from a PR failure.

`--release-policy` holds the exception list. Exceptions belong in a reviewed file with a
reason, not in a flag someone added to the workflow at 6pm.

Then record what actually shipped:

```bash
executable-stories deploy record reports/raw-run.json --env production --tag v2.4.0
executable-stories deploy diff staging production
```

The ledger at `.executable-stories/deployments.json` turns "what is in prod?" into a
command. `deploy diff` shows scenario drift between two environments, which is the
question that gets asked during every incident.

## Stage 3: scheduled, not blocking

Some signals need time to mean anything, so they belong on a nightly job that reports
rather than blocks:

```bash
executable-stories format reports/raw-run.json \
  --history-file .executable-stories/history.json --max-history-runs 30 \
  --format html --output-dir reports
```

History enables flakiness scoring and the per-scenario timeline in the HTML report.
Flakiness needs several samples before it will say anything, which is precisely why it
cannot live on a PR gate.

Route the outcome somewhere people already look:

```bash
executable-stories format reports/raw-run.json \
  --slack-webhook "$SLACK_WEBHOOK_URL" --notify on-failure --report-url "$REPORT_URL"
```

`--notify on-failure` is the default and the right one. A green notification every night
is a notification nobody reads by Thursday.

## The pre-built workflow

`packages/executable-stories-action` wraps the common shape as a GitHub Action: run,
format, gate, publish, comment. Prefer it to a hand-written workflow unless you need
something it does not do; see the `github-action` guide on the docs site.

## Publishing the report

Publish on every run, pass or fail. Pick the target that already has an audience:

- **Docs site**: build the Astro site and deploy it (`living-docs-site`).
- **Confluence or Jira**: `--format confluence` then `publish-confluence` /
  `publish-jira`. Use `--dry-run` first; it prints the request plan without posting.
- **Test-management systems**: `sync testrail|xray` (`test-management-bridge`).
- **Cloud**: `executable-stories push run.json`.

## What good looks like

A PR gate that fires roughly as often as something is genuinely wrong. If it never fires,
it is decorative. If it fires on most PRs, it is measuring the wrong thing, and the next
person to be blocked by it will remove it rather than debug it.

## Relationship to neighbouring skills

- `agent-loop` uses the same commands inside a session rather than on the pipeline.
- `failure-triage` is what you run when a gate fires and the cause is not obvious.
- `spec-evidence-review` explains what `review` measures and how to author changes that
  satisfy it.
- `release-notes` turns the same compare output into something a stakeholder reads.
- `formatters-cli` is the full command and flag reference.
