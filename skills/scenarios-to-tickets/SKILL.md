---
name: scenarios-to-tickets
description: Use when the suite has found work the board does not know about — a failing scenario nobody owns, a planned scenario that never landed, a claim that asserts nothing, behaviour nobody has run in weeks — and it should become tickets. Turns run artifacts into a proposed, deduplicated ticket list, creates them through MCP once the user approves, and writes the new ids back onto the scenarios.
---

# Scenarios To Tickets

The board is a record of what somebody thought of. The suite is a record of what is
actually true. The suite finds work first, and almost none of it reaches the board: the
scenario that has been red since Tuesday, the `it.todo` from a sprint two quarters ago, the
green scenario that asserts nothing, the behaviour last exercised in July.

This skill turns those findings into tickets, then writes the ticket ids back onto the
scenarios so the loop closes rather than forking. It is the reverse of
`tracker-to-scenarios`, and the two share one rule: **the suite is the source of truth, the
tracker is the schedule**.

## What you need

An MCP server for the tracker (see the table in `tracker-to-scenarios`) and a current run.
A stale run produces tickets for work that is already done, which is worse than no tickets
at all — regenerate before you start.

## 1. Collect candidates, each from the artifact that knows

Do not read test files looking for problems. Every candidate below already has a command:

| Finding | Where it comes from |
| --- | --- |
| Failing and regressed scenarios, routed to a team | `executable-stories triage reports/raw-run.json --baseline auto --by-owner` |
| Scenarios switched off (skipped, not planned) | `executable-stories check reports/raw-run.json` — the turned-off list |
| Planned scenarios that never landed | `list --list-format json`, status `pending` (`planned: true` in the StoryReport) |
| Claims that assert nothing | the CLI summary's `unasserted` count; Evidence Review grades them `none` |
| Behaviour nobody has run lately | scenario staleness in the report (`--html-stale-after-days`) |
| Scenarios over the time budget | `executable-stories check reports/raw-run.json --max-duration 30000` |
| Requirements with no scenario at all | `coverage-audit` |

Age matters more than volume. A scenario red for one run is a build in progress; one red
for three weeks is a decision nobody made out loud, and that is the ticket.

## 2. Deduplicate before you propose anything

Three checks, all cheap, in this order:

1. **Does the scenario already carry a ticket?** `tickets[]` in the `list` output. If it
   does, this is a comment on that ticket, not a new one — hand it to `tracker-receipts`.
2. **Does the tracker already have one?** Search by the scenario title and by the marker
   this skill writes:

   ```md
   <!-- executable-stories:source scenario=feature-src-checkout-suspension-story-test--checkout-is-blocked-for-a-suspended-account -->
   ```

3. **Do several findings share one cause?** Twelve failures from one broken helper is one
   ticket, not twelve. `triage` already groups by the code each failure `covers`; use its
   cascade grouping rather than filing per red line.

An agent that files duplicates gets its access revoked within a week, and rightly.

## 3. Propose the list, and wait

Show the user a numbered table before creating anything: title, the finding behind it, the
owning team from `--by-owner`, and the scenario it came from. Ask which to create.

Cap the batch. More than about ten proposed tickets means the finding is a project, not a
backlog item — say that, and propose one ticket to schedule the work instead of forty that
will be closed unread. Never create tickets without an explicit yes, even when the user
asked for the review.

## 4. Create tickets that carry their evidence

One ticket per behaviour. The body says what is true now, what should be true, and how
anyone will know it changed:

```md
<!-- executable-stories:source scenario=feature-src-checkout-suspension-story-test--checkout-is-blocked-for-a-suspended-account -->

**Failing since 2026-08-12** (14 runs) — [see the scenario](https://acme.github.io/report/#feature-src-checkout-suspension-story-test--checkout-is-blocked-for-a-suspended-account)

    Given a suspended account
    When the account holder starts checkout
    Then checkout is blocked        ⟵ failed here

`expected 403, received 200`

**Covers:** `src/checkout/suspension.ts`
**Owner:** @acme/payments (from CODEOWNERS)

**Done when:** the scenario passes —
`executable-stories goal reports/raw-run.json --require-tickets <this ticket>`
exits 0. No new scenario needed; this one already specifies the behaviour.
```

For a planned scenario the shape is the same with the promise in place of the failure: the
scenario title, the file it sits in, and "done when it stops reading *(planned)*".

Write the run's own vocabulary into the ticket — the scenario title unchanged, the steps as
they are written. A ticket that paraphrases the scenario starts the drift this skill exists
to close.

## 5. Write the ticket id back onto the scenario

This is the step that makes it a loop rather than a fork:

```ts
it('checkout is blocked for a suspended account', ({ task }) => {
  story.init(task, { ticket: 'PAY-1187', covers: ['src/checkout/suspension.ts'] });
```

A planned scenario cannot carry one (no `story.init` on a todo), so put the id in the
context story for that file and note the hand-off, exactly as `tracker-to-scenarios` does.

Once the id is on the scenario, `tracker-receipts` can prove the ticket later without
anyone re-deriving the link, and this skill will not propose it again.

## When it goes wrong

- **The scenario is wrong, not the code.** A red scenario can be a bad spec. Fix or delete
  the spec — deliberately, in the open — instead of filing a ticket to make the code match
  a mistake.
- **Every candidate belongs to one team.** You have found an ownership problem, not twenty
  bugs. Say so; one ticket about the unowned area beats twenty they will not read.
- **A finding has no owner at all.** `triage --by-owner` listed it as Unowned. Filing it
  anyway parks it in a queue nobody reads. Name the gap to the user and let them route it.
- **The board fills with agent tickets.** The cap exists for this. Fewer, older, better
  evidenced findings earn the next batch a reading.

## Relationship to neighbouring skills

- `tracker-to-scenarios` is the inbound direction: a ticket becomes planned scenarios.
- `tracker-receipts` proves a ticket from a run and stamps it, using the ids this skill writes.
- `failure-triage` classifies a red run before any of it becomes a ticket; run it first.
- `coverage-audit` finds the requirements with no scenario at all, which are tickets of a
  different kind: write the spec, not the fix.
- `bug-to-scenario` is the opposite move for an incoming bug report: reproduce it as a
  failing scenario before anyone files anything.
