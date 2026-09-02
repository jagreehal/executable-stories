---
name: tracker-receipts
description: Use when a tracker and the suite have drifted, or when a ticket should carry proof that its behaviour passes — reconciling Jira, GitHub, or Linear tickets against scenarios, then posting an idempotent receipt with the verdict and a deep link to the report. Tool-agnostic over MCP. The run is the evidence; the ticket is the record.
---

# Tracker Receipts

A ticket says Done. The suite says the scenario has been red for nine days. Both are
written down, both look authoritative, and the disagreement is invisible until a customer
finds it.

This skill closes the loop the other way from `tracker-to-scenarios`: take a run, reconcile
it against the tracker, and stamp each ticket with what the run actually proves. Done that
way, a ticket someone opens a year later still says whether the behaviour holds — living
documentation, rather than a status somebody set once.

**The run is the evidence. The ticket is the record.** Never edit a scenario to match a
ticket's status.

## What you need

An MCP server for the tracker (see the table in `tracker-to-scenarios`), a run, and a
published report to point at.

```bash
pnpm test
executable-stories format reports/raw-run.json --format story-report-json,html \
  --output-dir reports --output-name index
```

There is no `executable-stories tracker-sync` command, and this skill does not pretend
otherwise: the join between tickets and scenarios is yours to compute from the artifacts
below.

## 1. Build the join

```bash
executable-stories list reports/by-file --list-format json
executable-stories format reports/raw-run.json --format story-report-json \
  --output-dir reports --output-name index
```

`list` gives you every scenario with its `tickets[]`, `status`, `covers` and `sourceFile`:
group that by ticket id. Take the **anchors** from the StoryReport JSON instead —
`features[].scenarios[].id`, e.g. `feature-src-checkout-suspension-story-test--checkout-is-blocked-for-a-suspended-account`,
which is the id the HTML report renders, so `<report-url>#<that id>` lands on the scenario.
The short ids in `list` output are not those anchors.

Then fetch the matching issues through MCP — by id where you have one, and by the tracker's
own search where you are checking the other direction: tickets in this epic, sprint, or
label that no scenario names at all.

Normalise ids before matching: case, whitespace, and a `#` or project prefix people type
inconsistently. A silent mismatch reads as "no coverage" and sends someone to write a
scenario that already exists.

## 2. Name the drift, in both directions

| What you find | What it means | What to do |
| --- | --- | --- |
| Ticket closed, no scenario cites it | Nothing proves it shipped | Report it; offer `tracker-to-scenarios` to write the missing spec |
| Ticket closed, its scenario is red | The tick is a lie | Raise it first, before any receipt goes out |
| Ticket open, its scenarios all pass | The work landed and the board did not move | Propose the transition; let a human make it |
| Only a *planned* scenario names the ticket | A promise, not proof | Say "planned", never "verified" |
| Scenarios pass but asserted nothing | The claim ran; nothing checked it | Treat as unproven (`unasserted` in the CLI summary) |
| Scenario cites a ticket the tracker does not have | Stale reference, usually a renamed project key | Fix the scenario's ticket id, not the tracker |

The drift report is worth posting even when no receipt is. A team that sees "four closed
tickets nothing proves" learns more from that line than from four green ticks.

## 3. Get a verdict per ticket

Do not eyeball the statuses; ask the CLI, which applies the same ratchet a release gate
does:

```bash
executable-stories goal reports/raw-run.json --require-tickets PAY-1042 \
  --baseline auto --no-regressions --goal-format json
```

Exit 0 means met: every scenario carrying that ticket passes, nothing regressed, and no
scenario was removed or weakened against the baseline. Exit 5 means not yet — and the JSON
says which scenario is holding it. That distinction is the whole value of the receipt:
green because it passes, not green because someone deleted the failing case.

## 4. Write the receipt

One comment per ticket, scoped to the scenarios that actually carry it:

```md
<!-- executable-stories:receipt ticket=PAY-1042 ref=main -->

✅ **Verified by the suite** — run `2026-09-02T09:14Z`, 3 scenarios, 0 failing

- [checkout is blocked for a suspended account](https://acme.github.io/report/#feature-src-checkout-suspension-story-test--checkout-is-blocked-for-a-suspended-account)
- [the suspension notice names the support contact](https://acme.github.io/report/#feature-src-checkout-suspension-story-test--the-suspension-notice-names-the-support-contact)
- [a lifted suspension restores checkout on the next attempt](https://acme.github.io/report/#feature-src-checkout-suspension-story-test--a-lifted-suspension-restores-checkout-on-the-next-attempt)

The report is authoritative. If these scenarios go red, this ticket is no longer proven.
```

Rules that keep a receipt worth reading:

- **Idempotent.** Search the issue's comments for the marker. Found → update in place.
  Not found → create one. A ticket with eleven bot comments gets muted, and then the one
  that mattered is muted too.
- **Deep-linked.** Link each scenario by its report id anchor, not the test file. The
  audience for a receipt often cannot read the test.
- **Honest about strength.** Say "planned", "passed", or "passed without assertions".
  Never "verified" for the last two.
- **Never a status change on its own.** Propose the transition, show it, and let the user
  decide. A green tick from a bot that also closes the ticket is how a board stops being
  believed.

Confirm the target list and the exact text before the first write, unless the user has
already said to post.

## 5. Make it repeatable

- **On a PR** — reconcile against the head run and post receipts for the tickets that
  branch touches. Pair with `ci-gates`.
- **On a release** — receipts for every ticket in the release, generated once from the RC
  run (`gate-release`), so the release notes and the tickets tell the same story
  (`release-notes`).
- **On a schedule** — the drift report alone, weekly. Drift is cheap to fix the week it
  appears and expensive a quarter later.

Where an MCP server needs interactive OAuth, this is an agent-side convenience rather than
unattended CI. For a headless path, publish the report and use the tracker's own API from
the pipeline; for Confluence and Jira pages specifically, `publish-confluence` and
`publish-jira` already take ADF output from the formatter.

## When it goes wrong

- **Nothing matches.** Ticket ids live somewhere other than `story.tickets` — a tag, a test
  name, a commit message. Fix the source: put the id in `ticket:` (`tracker-to-scenarios`),
  do not teach the receipt to parse test names.
- **One scenario covers eleven tickets.** The scenario is a smoke test wearing a spec's
  clothes. Receipts from it prove nothing specific; split it.
- **The receipt would be the ticket's only content.** The ticket was never written down
  properly. Say so; a receipt on an empty ticket looks like proof of a specification that
  does not exist.
- **A ticket is proven by scenarios in another team's suite.** Fine, but say whose run it
  was. Provenance is half of what makes a receipt trustworthy.

## Relationship to neighbouring skills

- `tracker-to-scenarios` is the inbound half: ticket → planned scenarios.
- `linear-evidence-review` is the Linear-specific version of this workflow, kept for the
  Evidence Review receipt shape it already proved.
- `coverage-audit` answers "is it covered?" by requirement, code, and evidence strength —
  the same questions, without the tracker.
- `spec-evidence-review` shapes what a claim has to carry before a receipt can call it
  verified.
- `test-management-bridge` mirrors runs into TestRail or Xray, where the tool expects test
  cases rather than issues.
- `ci-gates` decides which of these runs blocks a merge and which only reports.
