---
name: spec-grilling
description: Use when one person holds the answers and a feature request is too vague to write scenarios from — a one-line ticket, a "can we just make it do X", a plan with a hole in it. Interrogates the requester in rounds, one frontier of questions at a time with a recommended answer attached to each, until every branch is settled and the scenarios can be written.
---

# Spec Grilling

Vague requirements produce vague tests, and a vague test is worse than no test because it
looks like coverage. The usual failure is not that nobody asked questions, it is that the
questions arrived one at a time over four days, each answer invalidating the last.

Grilling fixes the sequencing. Model the feature as a **decision tree**: every decision
branches into the decisions that hang off it. The **frontier** is every decision whose
prerequisites are already settled, the questions you can ask *now* without guessing at
answers you have not heard. Ask the whole frontier in one round. Wait. Recompute.

This is a one-to-one interview discipline. When you have the whole team in a room, run
`spec-example-mapping` instead: cards work better in a group, and grilling works better
when one person holds the answers and has ten minutes.

## Agent guardrails

- **Finding facts is your job, never theirs.** If a question can be answered by reading
  the code, the run artifacts, or a config file, go and read it. Asking a person what
  their own system currently does is a tax you charge for not looking.
- **Decisions are theirs.** Never answer a business question on their behalf and never
  quietly proceed on an assumption. An assumption you had to make is an open question.
- **Attach a recommendation to every question.** An unanswerable open question is a burden;
  a recommendation the user can accept or reject takes five seconds.
- **Do not write scenarios mid-grilling.** Scenarios written against a frontier that is
  still moving get rewritten. Finish the tree.
- **Never leave a settled decision only in the chat.** It lands in a scenario, a planned
  scenario, or an open-question list. Chat is not an artifact.

## Before the first round

Read the artifacts, not the source, and read them first:

```bash
executable-stories list reports/raw-run.json --list-format json
```

You are looking for three things, and each one removes questions from the frontier:

- **Scenarios that already cover this.** The answer to "should it do X?" is sometimes
  "it already does, here is the scenario".
- **The vocabulary the suite uses.** Ask the question in the project's own words or you
  will get an answer about a different concept (`spec-domain-language`).
- **Adjacent behaviour.** The rules that govern a neighbouring capability are the default
  answer for this one, and proposing that default is a much better question than an open
  one.

## The rounds

Ask the whole frontier at once, numbered, each with a recommendation:

```
❓ **Q1 — Which accounts can be suspended?**
Only customer accounts, or staff accounts too? Staff suspension would need a
different notification path.

➡️ Customer accounts only. Staff is an admin concern and nothing else in the
   suite treats staff as an account holder.

❓ **Q2 — What happens to an in-flight basket when suspension lands?**
Discard it, freeze it, or let it complete?

➡️ Freeze it. Discarding loses the customer's work and the recovery flow already
   exists for abandoned baskets.
```

A question whose answer depends on another question still open in this round belongs to a
**later** round. Putting it in this one produces answers that contradict each other, which
is the failure mode grilling exists to avoid.

Each round the user answers reshapes the tree: settled decisions push the frontier
outward and unblock what depended on them. Recompute and ask the next round.

When a frontier question needs a fact from the environment, go and get it. Do not block
the round on it: only the questions downstream of that fact wait, so ask the rest now.

**The session is done when the frontier is empty.** Every branch visited, nothing silently
assumed. Do not start writing until the user confirms you have reached the same
understanding.

## What comes out

Three artifacts, in this order, all of them in the suite rather than in a document:

1. **Scenarios for every settled decision.** In the project's vocabulary, outcome-first.
   Write them as planned scenarios if the work has not started (`spec-plan-to-stories`),
   or drive them test-first (`story-tdd`).
2. **Planned scenarios for the deferred decisions.** A decision the user postponed is
   still a decision, and `it.todo('...')` keeps it visible and burning down instead of
   scrolling out of a chat log.
3. **An open-question list attached to the feature**, not floating in prose:

   ```ts
   story.section({
     title: 'Open questions',
     markdown: [
       '- Does a suspension expire, or does it need a manual lift? (asked 2026-08-09)',
       '- Who is notified when a suspension lands?',
     ].join('\n'),
   });
   ```

   Mark anything you drafted rather than confirmed with `authored: "agent"` so a reader
   can tell a decision from a suggestion.

If the questions turn out to be for someone who is not in the conversation, stop grilling
and switch to `spec-questionnaire`: it packages the gap for an async recipient rather than
guessing on their behalf.

## When grilling goes wrong

- **Every answer is "it depends".** The story is too big. Split it and grill one slice.
- **The user answers a different question.** Your question carried a term that means
  something else to them. Sharpen the term (`spec-domain-language`), then re-ask.
- **You have asked twelve rounds.** You are grilling the implementation, not the
  behaviour. Return to the outcome the user wants and prune the tree.
- **The user is guessing.** They do not hold the answer either. Find who does.

## Relationship to neighbouring skills

- `spec-example-mapping` is the group version, with rules, examples, and question cards.
  Grilling is one-to-one and depth-first along a tree.
- `spec-questionnaire` handles the answers that live with someone unavailable.
- `spec-domain-language` runs alongside: sharpen a fuzzy term the moment it appears rather
  than after the scenarios are written.
- `spec-refine-examples` turns the settled answers into precise scenario titles.
- `spec-story-mapping` is the layer above: it decides which feature to grill next.
