---
name: spec-questionnaire
description: Use when the open questions blocking a specification belong to someone who is not in the conversation — a domain expert, a compliance officer, a partner team, a customer. Packages the gap as a questionnaire they can answer async, and turns each returned answer into a scenario so the knowledge lands in the suite rather than in an inbox.
---

# Spec Questionnaire

Specification work stalls on questions nobody in the room can answer. The usual response
is to guess, ship, and find out. The alternative most teams reach for is a meeting, which
costs a week of calendar and produces a decision nobody wrote down.

A questionnaire is the cheap middle. It is one document, aimed at one person, asking only
what that person knows and you do not. The discipline that makes it work: **interrogate
the send, not the subject.** You cannot ask the requester about the domain expert's
domain, but you can always ask them who the recipient is and what they need back.

## Agent guardrails

- **Never fill in an answer to keep the document tidy.** An unanswered question is the
  output. Guessing on behalf of an absent expert is how compliance gaps ship.
- **Do not send it yourself.** Write the file, report the path, let the user send it. A
  questionnaire that arrives from an agent gets answered like spam.
- **One idea per question.** A compound question gets a compound answer, and the half you
  needed is the half they skipped.
- **Every returned answer becomes a scenario or a recorded decision.** An answer that stays
  in the document is a document nobody will read in a month.

## Step 1: interrogate the send

Two exchanges, both answerable by the person in front of you.

**Who is it going to?** Their role, expertise, and relationship to the requester. This
fixes the tone and how much context the document must carry. A compliance officer needs no
explanation of the regulation and a lot of explanation of your system; a partner team's
engineer needs the reverse. Done when you know what the recipient knows that the user does
not.

**What do you need back?** The specific decisions the user cannot resolve alone. Done when
you have a concrete list of what they must walk away able to decide.

Anything outside that gap does not belong in the questionnaire. A question you could
answer by reading the code is a question you should go and answer.

## Step 2: mine the questions from the spec work

The questions usually already exist and are scattered:

- Red question cards from `spec-example-mapping`.
- Frontier questions from `spec-grilling` that the user could not answer.
- Rules with no example, which means nobody knows the boundary.
- Existing scenarios that contradict each other, which is the highest-value question you
  can ask because it comes with evidence:

  ```bash
  executable-stories list reports/raw-run.json --list-format json
  ```

  "These two scenarios both pass and they appear to disagree about partial refunds. Which
  one is right?" gets an answer where an abstract question gets a shrug.

## Step 3: write the document

Write it to `spec-questionnaire-<slug>.md` in the repo, next to the spec work, and report
the path. Order most-important-first: async means you may only get one pass.

```markdown
# Refund eligibility rules

**Purpose:** we are automating refund eligibility and cannot find the rule for
payments older than 90 days. This decides whether we build a manual review path.

**From:** Jag (engineering) — **To:** Priya (payments compliance) —
**How your answers will be used:** each answer becomes a test that runs on every
release, so the rule stays enforced rather than documented.

## Context

One paragraph orienting a recipient who was not in your head. What the system does
today, what is changing, why their answer is load-bearing. Not a page.

## How to answer

Deadline and rough effort. Partial answers and "I don't know" are useful — flag
anything you are unsure of rather than skipping it.

## Eligibility window

### Can a card payment older than 90 days be refunded?

_Why this matters: it decides whether we build a manual review path or reject
outright._

>

### When the window has expired, what should the customer see?

>
```

One `##` section per theme once there are more than a handful of questions. An answer stub
(`>`) directly under each question. A one-line *why this matters* only where the question
could be misread or invite a throwaway answer. Close with a catch-all: *anything we did
not ask that we should know?*

Tell the recipient their answers become tests. It changes the answers: people are more
precise when they know the rule will be enforced automatically.

## Step 4: land the answers in the suite

This is the step that gets skipped, and skipping it wastes the whole exercise.

| What came back | Where it goes |
| --- | --- |
| A clear rule | A scenario, in their words, with a `ticket` link if there is one |
| A rule with edge cases | A decision table (`spec-rules-decision-tables`) |
| "It depends on X" | Back to the frontier. X is a new question |
| "I don't know" | A planned scenario plus a `known-issue` note, honestly labelled |
| A correction to existing behaviour | A failing scenario first, then the fix (`bug-to-scenario`) |

Attribute the source on the scenario so the next person does not re-ask:

```ts
story.init(task, { tags: ['capability:refunds'] });
story.note('Rule confirmed by payments compliance, 2026-08-09');
story.link({ label: 'Refund eligibility questionnaire', url: '../spec-questionnaire-refunds.md' });
```

Then send the answers back as running scenarios rather than as a thank-you. A compliance
officer who can see their rule enforced on every release answers the next questionnaire
faster.

## When nobody answers

Do not fill the gap with a guess dressed as a decision. Declare the affected behaviour as
planned scenarios and let the gap be visible in the report. An empty section of the
capability map is a much better prompt for the person who owes you an answer than a
reminder email.

## Relationship to neighbouring skills

- `spec-grilling` produces the questions; this skill handles the ones aimed at someone
  who is not there.
- `spec-example-mapping` produces red question cards, the other main input.
- `spec-rules-decision-tables` is where a returned rule with edge cases lands.
- `spec-plan-to-stories` is how an unanswered question stays visible without being a
  guess.
