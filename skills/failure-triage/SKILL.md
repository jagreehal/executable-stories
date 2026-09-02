---
name: failure-triage
description: Use when a run is red and you need to know what actually matters — several failing scenarios, a flaky suite, a CI job that broke on a branch nobody touched. Turns a wall of failures into a routed worklist from the run artifacts, and classifies each one before any code is changed.
---

# Failure Triage

Fourteen failures is almost never fourteen problems. It is usually one broken fixture,
two genuine regressions, one flaky scenario that has been flaky for a month, and ten
scenarios downstream of the first. Reading them in file order is the slowest possible way
to find that out, and it is what everyone does.

Triage answers three questions in order, and the order is the point:

1. **What changed?** A scenario that passed yesterday and fails today is a different
   animal from one that has never passed.
2. **What is one problem wearing fourteen hats?** Group by cause before routing.
3. **What can be fixed, and by whom?** Each item leaves triage with a destination.

## Agent guardrails

- **Never go green by subtraction.** Deleting a failing scenario, skipping it, or
  deleting its steps is the one move this whole system exists to prevent.
  `goal --baseline` will catch it; do not make it have to.
- **Do not fix during triage.** Triage produces a routed list. Fixing the first thing you
  read is how the fixture that caused ten failures stays unnoticed.
- **Quarantine is a decision with an owner and a date, not a shrug.** A scenario tagged
  `known-issue` and left forever is a lie that has learned to look tidy.
- Read the artifacts, not the test files. `triage` and `check` already know which code
  each failure covers.

## Get the worklist

```bash
executable-stories triage reports/raw-run.json --baseline auto --triage-format json
```

This is the discovery view: failing scenarios, regressions first, each with the product
code it covers, the error, and its tickets. Failures with no `covers` are flagged, which
is itself a finding — an unroutable failure means nobody can be sent to fix it without
reading the test.

When the repo has a `CODEOWNERS`, add `--by-owner` to split the same worklist the way the
repo already divides responsibility:

```bash
executable-stories triage reports/raw-run.json --baseline auto --by-owner
```

Each failure routes by the code it covers — where the fix lands — and falls back to its
test file when a scenario declares no `covers`. Unclaimed failures group under `Unowned`,
last, because they need a decision about who takes them before anyone can start.

`triage` always exits 0. It reports work, it does not gate. For the gating view, use
`check`, which expands each failing scenario into its steps and exits 5:

```bash
executable-stories check reports/raw-run.json --baseline auto
```

`--baseline auto` adds "N regressed / N fixed" against the prior run, which is the single
most useful line in the output.

## Classify before you route

Put every failure in exactly one bucket. Most runs need only the first three.

| Bucket | How you recognise it | Where it goes |
| --- | --- | --- |
| **Regression** | Passed in the baseline, fails now, and the change is in code it covers | Highest priority. `bug-to-scenario` if the cause is not obvious |
| **Cascade** | Many failures share one `covers` path or one error string | Fix the shared cause; recount afterwards, do not triage the rest |
| **Environment** | Fails identically for scenarios with nothing in common (network, clock, missing binary, sandbox) | Fix the environment. Not a product defect and must not be filed as one |
| **Flaky** | History shows it alternating pass/fail with no code change | See below. Do not "fix" by retrying |
| **Stale expectation** | The product changed deliberately and the scenario still asserts the old promise | Update the scenario *and* say so in the changelog. This is a behaviour change, not a test fix |
| **Genuinely new** | Never passed; usually a scenario written ahead of the code | Belongs to whoever is building it. If it is not being built, make it planned |

The distinction between **regression** and **stale expectation** is the one people get
wrong, and it is the one that matters most. Both look like "test fails, code changed".
The question is whether the *promise* was meant to change. If it was, the scenario edit
must be visible to readers, because someone is relying on the old behaviour.

## Flakiness is a measurement, not an opinion

Turn on history and the run tells you rather than you guessing:

```bash
executable-stories format reports/raw-run.json \
  --history-file .executable-stories/history.json --max-history-runs 30
```

Flakiness is computed from status transitions across the retained runs, so it needs a few
samples before it will say anything. Below that threshold a scenario reads as stable, and
"it failed twice this week" is not yet evidence.

A scenario that is genuinely flaky has a cause worth naming: shared state between tests,
a real timing race in the product (the most valuable kind, and the one retries hide), an
external dependency, or ordering. Retrying converts a product bug into a customer bug.

## Sharded and filtered runs

A CI shard or a filtered run does not contain the whole suite, and comparing it naively
reports every untouched scenario as removed:

```bash
executable-stories compare baseline.json shard-run.json --partial
```

`--partial` treats baseline scenarios in files the current run never touched as not-run
rather than removed. Without it, a sharded pipeline reports catastrophic false removals
and everyone learns to ignore the gate.

## What triage hands over

Report the buckets, not the raw list. For each item: the scenario title, the bucket, the
covered code, the suspected cause, and the destination. Then the one-line summary that
actually gets read:

> 14 failing: 1 regression (checkout guard, `src/checkout/guard.ts`), 10 cascading from
> it, 2 environment (Chromium sandbox), 1 flaky since 12 runs (`payment webhook retry`).

Fixing the regression is expected to clear 11.

## Relationship to neighbouring skills

- `bug-to-scenario` takes one triaged item and turns it into a reproduction and a fix.
- `agent-loop` runs `triage` as the discovery phase of an autonomous session; this skill
  is the human-readable version of the same artifact.
- `ci-gates` decides which of these failures should have blocked the merge in the first
  place.
- `coverage-audit` answers the opposite question: not "what failed" but "what was never
  covered at all".
