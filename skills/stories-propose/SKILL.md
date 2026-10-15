---
name: stories-propose
description: Start here for new work. Takes an idea from a one-line request to planned scenarios in the report, then drives them green one at a time. A router over the discovery, planning, and build skills.
disable-model-invocation: true
---

# Stories Propose

The front door for plan-first work. Other tools write the plan as a Markdown spec and ask
an agent whether the code still matches it. Here the plan is a set of **planned
scenarios** in the test files: the report shows them, the run burns them down, and
nothing has to be kept in sync by hand.

This skill routes. Each step names the skill that does the work and the condition that
ends the step. Finish a step before starting the next one.

## The flow

### 1. Read what exists

```bash
executable-stories list reports/by-file --list-format json
```

Done when you can name the scenarios that already cover the idea, the ones next to it,
and the vocabulary they use. An idea already covered by a passing scenario is finished
work: say so and stop.

### 2. Shape the idea

Pick the one situation that fits:

| Situation                                          | Skill                        |
| -------------------------------------------------- | ---------------------------- |
| One person holds the answers, the request is vague | `spec-grilling`              |
| A group in a room, rules and examples to find      | `spec-example-mapping`       |
| The answers belong to someone who is not here      | `spec-questionnaire`         |
| The idea starts as a ticket                        | `tracker-to-scenarios`       |
| Too big for one session                            | `spec-story-mapping`         |
| Eligibility, pricing, or other rule-heavy policy   | `spec-rules-decision-tables` |
| Approvals, multi-step flows, state transitions     | `spec-workflow-state`        |

A questionnaire pauses the flow until the answers come back. A story map ends it: run
this skill once per slice the map produces.

When a question needs running code to settle (does this state model hold, what should
this screen show), build a throwaway prototype, then bring the answer back as a decision.

Done when the decision tree is empty and the user confirms the shared understanding.

### 3. Agree the seams

For each behaviour, name the **seam** it will be tested at (an HTTP handler, a Playwright
flow, a module's public function) and the test file it will live in. Prefer an existing
seam, and the highest one that still fails fast. Fewer seams is better.

Done when the user has confirmed the seam list. An unconfirmed seam is how a scenario
ends up testing an implementation detail.

### 4. Declare the plan

Run `spec-plan-to-stories`. It writes one planned scenario per behaviour, a plan story
carrying the reasoning and open questions, and shows the burn-down.

Commit the planned scenarios on their own, before any production code. That commit is
the proposal: a reviewer reads the plan as a PR of scenario titles, in the reader's
language, and nothing has been built that a rejected plan would waste.

Done when the run lists every agreed behaviour with `planned: true` and the user has
approved the proposal.

### 5. Build one scenario at a time

Pick one planned scenario and run `story-tdd` on it: the planned declaration becomes a
red story test, then green. One scenario per cycle, never a batch of red tests.

```bash
executable-stories goal reports/raw-run.json \
  --require-scenarios "checkout is blocked for a suspended account" --baseline auto
```

Exit 0 closes that scenario. Keep steps 1 to 4 in one unbroken context, because each
step builds on the last one's reasoning. From step 5 on, each scenario can start in a
fresh context: its title and the plan story hold everything the implementer needs.

A failure you did not expect sends you to `failure-triage`. A behaviour you find
mid-build that was not in the plan gets its own planned scenario first, then waits its
turn.

### 6. Close

Done when all of these hold:

- No planned scenarios remain, or each one left is a decision the user deferred.
- `goal` without `--require-*` exits 0.
- `executable-stories compare <pre-plan run> <current run> --format changelog` shows the
  behaviour the plan promised and nothing it did not.
- `spec-review` has critiqued the new scenarios.
- The plan story no longer says anything the run contradicts. Delete stale blocks, or
  restate them with `explain-change`, which cites the run.

There is no archive step. The run is the record.

## Handing off between sessions

End every step by telling the user the next step and the line that resumes it, for
example `/stories-propose step 5: build "checkout is blocked for a suspended account"`.
They can run it here, after compaction, or in a new session.

From step 5 on, nothing else is needed: the planned scenarios and the plan story carry the
plan. Before step 4 the reasoning lives only in this context, so a session that has to
stop early runs a short step 4 first. It declares what is settled as planned scenarios,
and the open branches of the decision tree as open questions in the plan story. The next
session reads them with `list` and the plan story, and carries on from step 2 or 3.

## Where the usual spec documents go

| Usual document | Here                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Proposal, why  | `story.section` in the plan story                                                                                                     |
| Requirements   | Planned scenarios                                                                                                                     |
| Design         | `story.section`, `story.mermaid`, and `file-tree` blocks marked `authored: "agent"`, or an ADR when the decision outlives the feature |
| Task checklist | Nothing. Tasks are not behaviour, and the planned count is the progress bar                                                           |
| Open questions | A list in the plan story, never an invented scenario                                                                                  |
