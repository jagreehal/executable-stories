---
name: release-notes
description: Use when writing release notes, a sprint-review script, or a "what changed" summary for a repo that uses executable-stories. Derives the notes from the behavioural diff between two runs, so every line is a behaviour that actually ran, and behaviour that quietly disappeared shows up instead of going unmentioned.
---

# Release Notes

Release notes written from a commit log describe what the team typed. Release notes
written from the behavioural diff describe what the system now does differently, which is
the only thing the reader can use.

The difference shows up most in what each one misses. A commit log cannot tell you that a
scenario vanished. The behavioural diff leads with it.

## Agent guardrails

- **Only claim what ran.** Every line traces to a scenario in the current run. A feature
  that shipped without a scenario gets written as "not covered by a scenario", or it does
  not get written.
- **Report removals.** A scenario that existed last release and does not exist now is
  either a deliberate withdrawal or an accident, and both need saying out loud.
- **Do not translate a failing scenario into a shipped feature.** Status travels with the
  claim.
- **Do not invent a user benefit the scenario does not support.** "Faster checkout" needs
  a scenario that measures it.

## Get the diff

```bash
executable-stories compare last-release/raw-run.json reports/raw-run.json \
  --format changelog --output-dir reports --output-name release
```

This writes `reports/release.changelog.md`, a release-notes-style behaviour changelog. It
is the spine of the notes, not the finished article: it knows what changed, it does not
know which changes the reader cares about.

Four categories come out, and each has a different owner in the finished notes:

| In the diff | In the notes |
| --- | --- |
| Scenarios that appeared | New capability. The headline section |
| Scenarios that changed | Behaviour that works differently. The section that generates support tickets if omitted |
| Scenarios that disappeared | Withdrawn or accidentally deleted. Never omit |
| Status flips | Fixed, or newly broken. Both are news |

Pass `--partial` when the current run is a shard or a filtered run, or scenarios in
untouched files report as removed and the notes will announce a catastrophe that did not
happen.

## Pin what shipped

```bash
executable-stories format reports/raw-run.json --format release-manifest \
  --output-dir reports --output-name release
```

The manifest records the run window, git sha, branch, per-status counts, every scenario
with its source location and tags, and a `testedTogetherHash`. That hash is the useful
part months later: it identifies this exact set of behaviours as verified together, so
"was this combination ever tested?" has an answer.

Record the deployment as well, and the ledger answers the incident question:

```bash
executable-stories deploy record reports/raw-run.json --env production --tag v2.4.0
executable-stories deploy diff staging production
```

## Write for three readers

The same diff produces three documents. Do not try to write one that serves all three.

### Users

What they can now do, in their own vocabulary, with no scenario ids and no ticket numbers.
Take the scenarios tagged `audience:stakeholder` or grouped under a `capability:` and
rewrite each outcome as a sentence starting with the user.

> Refunds now settle within five days for card payments made in the last 90 days.

If a new scenario cannot be rewritten this way, it is probably internal, and it belongs in
the engineering section instead.

### Stakeholders

Capability deltas plus honesty about what did not land. Group by `capability:` tag and
report each group's status. This is where planned scenarios earn their keep: a capability
with three passing and two planned scenarios is a truthful progress statement that needs
no maintenance.

Include known issues. A `known-issue` scenario is a limitation you have chosen to ship,
and the release note is the right place to say so before a customer finds it.

### Engineers and QA

The changelog nearly as it comes: appeared, changed, disappeared, status flips, plus the
release manifest hash and the gate result.

## Sprint review and demo script

The same artifact drives a demo without a rehearsal document. Order the new and changed
scenarios into the sequence you will show, and for anything with a journey tag, open
`/journeys/<id>`: the walkthrough is already assembled in order, with screenshots, under
one aggregate status.

Two rules make the demo survive contact with an audience. Show the report, not a slide
about the report, because a question about a detail is then one click away. And show a
failing scenario if there is one: a demo where everything is green teaches the room that
the report is curated.

## Gate before you write

Notes describing a release candidate that never passed its gate are fiction:

```bash
executable-stories gate-release dev-run.json rc-run.json --release-policy policy.json
```

Exit 6 means the RC does not match what dev was tested doing. Write the notes after that
passes, or write them with the exceptions named.

## Publishing

Send them where the audience already is:

```bash
executable-stories format reports/raw-run.json --format confluence --output-dir reports --output-name release
executable-stories publish-confluence reports/release.adf.json --space-id ENG --title "Release 2.4.0" --dry-run
```

Drop `--dry-run` when the printed request plan is right. `publish-jira` posts to an issue
as a comment or description. For the docs site, an explainer page next to the stories
keeps the notes linked to the scenarios that prove them.

## Relationship to neighbouring skills

- `ci-gates` runs `gate-release` and `compare` on the pipeline; this skill reads their
  output.
- `audience-views` supplies the tags that let you group the notes by capability and
  audience.
- `explain-change` goes deeper on one change, with citations and a quiz, when a release
  contains something that needs teaching rather than announcing.
- `coverage-audit` answers the "is it covered" question the notes will provoke.
