---
title: Agent loops and backpressure
description: Give a coding agent feedback it can act on, a worklist to start from, and a definition-of-done it cannot fake.
---

A coding agent produces fast and you review slow. When the only feedback that bites comes from you, every mistake becomes review work. **Backpressure** is feedback that reaches the agent before it reaches you: a failing scenario the agent reads and repairs on its own. When the agent runs in a loop, unattended, the same signals become the loop's worklist and its stopping condition.

These commands read the raw-run your framework already writes. They do not replace your test runner or scheduler. They supply the verification an agent loop needs to run without you watching every turn.

| Loop phase | Command | What it gives the agent |
| --- | --- | --- |
| Discover | `triage` | a ranked worklist: failing scenarios, regressions first, each with the code it covers |
| Act | `check` | a fast per-turn signal: passing collapses to a count, failing expands to intent + error + covers |
| Terminate | `goal` | a behavioral definition-of-done it cannot fake |
| Remember | `traceability-matrix` | requirement coverage on disk that survives between runs |

## `check` — the inner-loop signal

Run it after the tests on every change. Passing scenarios collapse to a count line. Each failing scenario expands to its Given/When/Then, the step that broke, the error, and the product code it `covers`.

```bash
executable-stories check .executable-stories/raw-run.json --baseline reports/previous.json
```

```text
✓ 47 passed   ✗ 1 failed   (48 scenarios)

✗ Expired session redirects to login  (regressed)
  src/auth/session.story.test.ts:31
    Given an expired session
    When the user opens /dashboard
  ✗ Then they are redirected to /login
    → expected redirect to /login, received 200
  covers: src/auth/session.ts, src/middleware/auth.ts
  ticket: AUTH-123

⚠ 1 regressed since baseline (was passing).
```

`check` exits `5` when any scenario failed, so the agent's loop reacts before a human reads it. Pass `--no-fail` to report only, or `--check-format json` for structured input. A baseline adds the "N regressed / N fixed" deltas.

## `triage` — the discovery worklist

The scheduled automation that opens the loop needs a queue of what to work on, not a full report. `triage` lists failing scenarios, regressions first, each carrying its `covers` paths so the loop knows which files to send a fixer at.

```bash
executable-stories triage .executable-stories/raw-run.json \
  --baseline reports/last-green.json --triage-format json
```

Failures with no `covers` are flagged: the loop cannot route them to code, so they need a `covers` annotation or a human first. `triage` always exits `0` — it reports work, it does not gate.

## `goal` — the definition-of-done

A `/goal`-style loop runs until a verifiable condition holds. `goal` expresses that condition in behavior. It is met when the required scenarios pass, nothing regressed (with `--no-regressions`), and no scenario was removed, disabled, or had steps deleted versus the baseline.

```bash
executable-stories goal .executable-stories/raw-run.json \
  --require-tickets US-101 --baseline reports/last-green.json --no-regressions
```

```text
GOAL: not met
  ticket:US-101: 2/3 scenarios pass (1 failing)
  regressions: 0
  ratchet: clean (0 scenarios removed/weakened)
```

Exit `0` means met, `5` means not yet, so a loop runs until the verdict flips. Declare the target with `--require-tags`, `--require-tickets`, or `--require-scenarios`; with none given, the goal is "every scenario passes".

The **ratchet** matters for an unattended loop. An agent that can make "done" true by deleting the failing scenario will eventually try it. With a baseline, `goal` refuses a "done" that dropped, skipped, or shortened a scenario. Disable it with `--no-ratchet` if you need to.

## `traceability-matrix` — the memory

Tomorrow's run reads where today's stopped. The behavior artifacts on disk are that memory. The traceability matrix is the requirement-first view: each ticket, the scenarios that verify it, the code they cover, and whether they pass, plus any scenario linked to no requirement.

```bash
executable-stories format reports/raw-run.json \
  --format traceability-matrix --output-dir reports --output-name index
```

See the [Agent artifact contract](/guides/agent-artifact-contract/) for the StoryReport, scenario index, and behavior manifest an agent also reads.

## `serve` — watch the loop

`check`, `triage`, and `goal` are what the loop reads to act. `serve` is what _you_ read to watch. Kick off a multi-hour loop, leave one URL open, and see the behaviour catalogue change in realtime — no refreshing, no digging through logs.

```bash
executable-stories serve reports/raw-run.json --port 4321
```

It serves the HTML report and reloads the page whenever the loop rewrites the raw-run — over Server-Sent Events, so there is no dependency to install. It tolerates the file not existing yet: start it first, and it waits for the loop's first run.

The reload is the easy part; any static server can do that. What `serve` adds is the **delta strip** above the report. On the first run it pins a baseline, then on every run it shows what changed _since you started the loop_ — drawn from the same rename/move-resilient diff as `compare`:

```text
Live · run #14 · since you started: +6 passing, 1 regressed · this iteration: +1 passing
```

That one line answers the question you actually have at 2am: is the loop making progress or thrashing? The session total tells you the trajectory; the per-iteration delta tells you what the last turn did.

For a one-command demo, `apps/vitest-example` runs Vitest in watch mode alongside `serve`:

```bash
pnpm --filter vitest-example test:live
```

If you only want the reload and not the delta, you do not need `serve` at all — point any static server at the output, e.g. `live-server reports/`; the framework reporters rewrite `reports/test-results.html` on every run.

## Put it in the loop's instructions

The fastest backpressure runs without anyone asking. Add it to `CLAUDE.md` or `AGENTS.md`:

```text
After changing code:
- run the tests
- run: executable-stories check .executable-stories/raw-run.json --baseline reports/last-green.json
- fix every failure before continuing. Do not edit or skip a scenario to make it pass.

Stopping condition for this task:
- executable-stories goal .executable-stories/raw-run.json --require-tickets <TICKET> --baseline reports/last-green.json --no-regressions
- the task is done only when this exits 0.
```

## What the loop still leaves to you

A loop running unattended is also a loop making mistakes unattended. `goal` makes "done" a checked predicate over behavior and the ratchet stops the obvious cheats, but a green `goal` is evidence, not a guarantee you specified the right behavior. The Given/When/Then in `check` and the requirement view in `traceability-matrix` are there so you can read what the loop produced in behavior terms, fast, instead of reverse-engineering diffs. Build the loop, and stay the engineer who reads what it made.

## Related

- [Agent artifact contract](/guides/agent-artifact-contract/) — the StoryReport, scenario index, and behavior manifest.
- [MCP server](/guides/mcp-server/) — `get_failing_scenarios`, `get_scenarios_for_paths`, `get_behavior_diff`, `run_scenario`.
- [Release confidence](/guides/release-confidence/) — the before-PR and release gates (`compare`, `gate-release`).
- `serve` — the live docs URL for watching a loop in realtime (above).
