# Agent memory: <loop title>

Standing guidance for the `agent-<slug>` loop. The workflow adds this file to the agent's
prompt on every run, so an edit here changes every future PR, not just one. `/iterate`
comments on the loop's PRs update it too.

Keep it to guidance that lasts. One-off instructions belong in a PR comment, and run logs
belong nowhere.

## Scope

- May change: <dirs the agent may edit, e.g. `src/checkout/`, `tests/checkout/`>
- Read only: <dirs it may read but not edit>
- Never: generated files, lockfiles, `reports/`

## Excluded scenarios

<Scenario ids or files the controller should skip, each with the reason. Add the id to the
controller's jq filter too if the exclusion is permanent.>

## Reviewer guidance

<Lessons from reviewed PRs that should change future runs, e.g. "assert on the rendered
total, not the store value".>
