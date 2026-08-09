---
name: agent-loop
description: Use when a coding agent works autonomously in a repo that uses executable-stories — an AFK session, a background task, a loop that must decide for itself when it is finished. Wires discovery, backpressure, and a behavioural stopping condition out of the run artifacts so the agent is verified by the suite rather than by its own summary of its work.
---

# Agent Loop

An agent that grades its own homework converges on whatever it finds easy to claim. The
fix is not a better prompt, it is a verdict the agent does not control: a run, an exit
code, a diff against the last run.

executable-stories gives a loop four instruments, and they are deliberately separate
because they answer different questions:

| Command | Question | Exit behaviour |
| --- | --- | --- |
| `triage` | What work is there? | Always 0 — reports, never gates |
| `check` | Did what I just did work? | 5 while anything fails |
| `goal` | Am I finished? | 0 met, 5 not yet |
| `compare` | What did I change about the system's behaviour? | Gates only if asked |

## Agent guardrails

- **The goal is behavioural.** "Tests pass" is satisfied by deleting tests. `goal` with a
  `--baseline` refuses that: a removed, disabled, or step-stripped scenario fails the
  ratchet.
- **Read artifacts, not test files.** The artifacts are compact, canonical, and already
  tell you which product code each scenario covers. Reading the suite instead burns
  context and gets you a stale mental model.
- **Never claim a behaviour no scenario proves.** If the loop wants to report "checkout
  now handles suspended accounts", there must be a scenario id behind it. Otherwise say
  "not covered by a scenario".
- **One failing scenario is a signal, not an obstacle.** The loop's job when `check`
  exits 5 is to fix the product, not to make the check quieter.

## Produce the artifacts once per run

```bash
pnpm test
executable-stories format reports/raw-run.json --preset agent --output-dir reports --output-name index
```

The `agent` preset writes the four things a machine reads:

- `story-report-json` — the canonical StoryReport v1 contract
- `scenario-index-json` — the discovery index, with a content `hash` per scenario
- `behavior-manifest-json` — source files, tags, doc coverage, debugger warnings
- `agent-text` — the whole run as flat, token-lean text for pasting into a model

Add `--minify` when the artifacts are being read rather than diffed.

## The loop

### Discover

```bash
executable-stories triage reports/raw-run.json --baseline auto --triage-format json
```

Each entry carries the failing scenario, the code it covers, the error, and its tickets.
That is enough to route the item to a sub-agent without any of them reading the suite.
Failures with no `covers` are flagged; treat that flag as work, because an unroutable
failure will be handed to a sub-agent with no idea where to look.

### Work

One scenario at a time, through `story-tdd` or `bug-to-scenario`. Resist batching: a
sub-agent given six failures will fix the easy one and rationalise the rest.

### Push back

```bash
executable-stories check reports/raw-run.json --baseline auto
```

This is the inner-loop signal. Passing scenarios collapse to one count line; each failing
scenario expands to its Given/When/Then, the step that broke, the error, and the covered
code. That shape matters for a loop: a wall of green is tokens spent telling the agent
nothing, and `check` refuses to spend them.

Exit 5 means iterate. `--check-format json` for a structured read.

### Decide whether to stop

```bash
executable-stories goal reports/raw-run.json \
  --require-tickets PAY-1042 --baseline auto --no-regressions --goal-format json
```

Declare the target as tags, tickets, or explicit scenarios. With none given, the goal is
"every scenario passes", which is usually too coarse for a scoped session.

Exit 0 is the only legitimate reason for the loop to declare success. Not "the diff looks
right", not "the summary reads well".

### Report what changed

```bash
executable-stories compare reports/previous-run.json reports/raw-run.json --format changelog
```

The behavioural diff is what the loop should report to a human: scenarios that appeared,
changed, or disappeared. A code diff says what the agent typed; the changelog says what
the system now does differently, which is the only claim worth making.

## Live artifacts during a long session

```bash
executable-stories watch reports/raw-run.json --preset agent
```

`watch` regenerates the artifacts whenever the raw run changes, so a long-running session
reads a current index instead of one from forty minutes ago.

## MCP, when the agent has tools rather than a shell

`executable-stories-mcp` exposes the same artifacts as read-only tools:
`list_scenarios`, `get_scenario`, `get_failing_scenarios`, `get_feature_summary`,
`get_scenario_index`, `get_behavior_manifest`, plus `run_scenario` for a focused re-run.
Prefer these over shelling out when they are available: they load the report once and
project from it, rather than re-parsing per question.

## Wiring the stopping condition into a repeating loop

The pattern is a single condition, checked between iterations:

```bash
until executable-stories goal reports/raw-run.json --require-tags capability:checkout --baseline auto; do
  # one iteration: triage → work → test → format
done
```

Two failure modes to design against, both common:

- **The loop that cannot fail.** If the goal has no `--require-*` and no `--baseline`, an
  empty suite meets it. Always scope the goal, always pass a baseline.
- **The loop that never ends.** Cap the iterations and report the unmet goal honestly.
  An agent that stops and says "goal not met after 6 iterations, here is the remaining
  triage output" is more useful than one still running.

## Relationship to neighbouring skills

- `story-tdd` and `bug-to-scenario` are what happens inside one iteration.
- `failure-triage` is the same discovery artifact read by a human.
- `ci-gates` runs these commands on the pipeline instead of in a session; the exit codes
  are shared.
- `spec-plan-to-stories` seeds a loop with planned scenarios, giving `goal` something
  concrete to require before any code exists.
- `explain-change` turns a completed loop into an explanation a person can review,
  with citations back to the scenarios that ran.
