---
name: test-management-bridge
description: Use when a team runs TestRail or Xray alongside an automated suite and someone has to keep the two in step — reporting coverage to QA leadership, retiring manual cases that automation already covers, or recording executions after every run. Bridges the two without letting the test-management system become the source of truth.
---

# Test Management Bridge

A test-management system holds a second, hand-maintained copy of descriptions the tests
already contain. Someone updates it after every release, it drifts anyway, and QA
leadership makes decisions from the drifted copy.

The bridge is one-directional and that direction is not negotiable: **the suite is the
source of truth, the TMS is a mirror**. Everything else here follows from that.

Supported targets are TestRail and Xray (Jira Cloud). Plain Jira has no case model, so
nothing here works against Jira alone; for docs in Jira or Confluence, use
`publish-jira` and `publish-confluence` instead.

## Agent guardrails

- **Never let a case id shape a scenario.** A scenario titled "C1234 — user signs in" has
  put the mirror in charge. Title it for the reader and reference the case with
  `ticket: 'C1234'`.
- **Always plan before applying.** `sync` writes nothing without `--apply`. Read the plan
  and reconcile the counts before you pass it.
- **Never resolve a "possible duplicate" yourself.** Similarity is a hint for a human.
  Only a lockfile entry or an explicit ticket id may create a binding.
- **Commit the lockfile.** `.executable-stories/sync.lock.json` is what stops the next run
  creating 300 duplicate cases.
- **Point at the raw run, never a StoryReport.** A StoryReport has already dropped the
  attachment bodies and source paths that `sync` uploads; the CLI stops rather than
  syncing a stripped copy.

## Start read-only, always

```bash
executable-stories coverage testrail reports/raw-run.json
```

Read-only, needs only an API key, and answers the question QA leadership actually asks.
It buckets every case:

| Bucket | Meaning | What to do with it |
| --- | --- | --- |
| `automated` | A story already covers it | Nothing. This is the good number |
| `duplicated` | A manual case an automated story covers | Retire the manual case. This is the saving |
| `possible dupe` | Similar to a story, unconfirmed | A human confirms. Never auto-bind |
| `manual only` | No automated equivalent | The automation backlog, prioritised by risk |
| `untracked` | A story with no case | Usually fine. Only a gap if the TMS must be complete |

Three artifacts come out: the summary on stdout, `reports/sync-coverage.<provider>.json`
for CI and agents, and a Markdown file to paste into Slack or publish to Confluence.

`duplicated` is the line worth leading with. It is the manual regression effort the
automation has already replaced and nobody has stopped paying for.

## Then plan, then apply

```bash
executable-stories sync testrail reports/raw-run.json            # plan, writes nothing
executable-stories sync testrail reports/raw-run.json --apply    # writes
```

The plan shows creates, updates, unchanged, skipped, orphaned, executions, and
attachments. Reconcile it before applying. A plan proposing 400 creates on an established
project means the binding is wrong (usually a missing or uncommitted lockfile), not that
you have 400 new behaviours.

Four safety properties hold on every apply, and they are why the tool is safe to run from
CI:

- It never overwrites a case a human edited (hash mismatch means skip and report).
- It never touches a hand-authored case reached through a `ticket` id. Executions get
  recorded against it; the body is left alone.
- It never deletes. A removed story reports its case as orphaned.
- It never binds on a guess.

## Migrating a manual suite

The tempting move is to import every manual case as a scenario stub. Do not. You will get
400 planned scenarios nobody wrote, the report will be 90% promises, and the burn-down
will never move.

Work in this order instead:

1. **Run `coverage`.** The `duplicated` bucket is already done. Retire those cases first,
   because it is the cheapest win and it buys credibility for the rest.
2. **Sort `manual only` by risk, not by count.** Use the TMS's own priority field if it is
   maintained; otherwise ask which cases would be run before a release if there were only
   a day.
3. **Convert in slices, and rewrite rather than transcribe.** A manual case is written for
   a human executor: "click Login, enter valid credentials, observe dashboard". The
   scenario is the behaviour under it: "a registered user reaches the dashboard after
   signing in". Transcribing the clicks produces a brittle test and unreadable
   documentation.
4. **Link back as you go**, so coverage improves visibly:
   ```ts
   story.init(task, { ticket: 'C1234', tags: ['capability:auth', 'criticality:revenue'] });
   ```
5. **Re-run `coverage` after each slice.** The moving number is what keeps a migration
   funded.

Cases that should stay manual are a legitimate outcome: exploratory charters, usability
judgement, anything needing physical hardware. Say so explicitly rather than leaving them
in `manual only` looking like a backlog.

## Where the binding lives

The lockfile keys on a content fingerprint of the scenario's **steps**, not its title or
file path, so renaming a test or moving a file keeps the binding. Rewriting the steps does
not, and it should not: different steps are a different behaviour.

When CI creates a case, the lockfile diff shows up in the pull request that caused it, so
a reviewer sees the new case and its link before anyone opens the TMS.

## In CI

Run `coverage` on a schedule and `sync --apply` after a successful main-branch run. Do
not `--apply` from a feature branch: it creates cases for behaviour that may never merge,
and nothing deletes them afterwards.

Credentials come from the environment, never the config file, so the config is safe to
commit. TestRail wants `TESTRAIL_USERNAME` and `TESTRAIL_API_KEY`; Xray wants
`XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET`, plus `JIRA_EMAIL` and `JIRA_TOKEN` only if it
must edit an existing test's summary or description.

## Non-JavaScript repos

Nothing here is JavaScript-specific. Every adapter writes the same raw run JSON, and the
CLI ships as a standalone binary, so a Go, Rust, pytest, JUnit 5, or xUnit repo runs the
identical commands with no Node install.

## Relationship to neighbouring skills

- `coverage-audit` answers coverage against requirements and code; this one answers it
  against an external case inventory.
- `spec-convert-tests` covers rewriting an existing automated test into a business-facing
  scenario, which is the same rewrite step 3 above asks for.
- `ci-gates` decides when `sync --apply` runs.
- `formatters-cli` is the full flag reference for `coverage` and `sync`.
