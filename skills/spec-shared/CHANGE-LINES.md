# Writing a change line

This is the disclosed reference for how release notes, explainers, and any other
"what changed" line are written. Single source of truth — edit here, not in any
SKILL.md.

A change line has two parts: a heading that names the thing and what happened to
it, and a body that says what the system now does differently. Both are written
for a reader who was away while the change happened and has no context to spare.

## The heading

Name the thing, then say what happened to it. Build it from change words:
**added, removed, replaced, now, moved, split, blocked**.

Up to about 48 characters, sentence case.

**The test: if the heading could have been true before the change, it is not a
change heading.** "Batch sending improvements" was true last month too. "Postmark
now gets 500 emails per call" was not.

## The body

One line under the heading, up to about 140 characters, on what the change means
for behaviour: what happens now that did not before, or what stops happening,
with the numbers when they matter.

It is not a restatement of the heading, and not a description of the code. A
heading with no body reads as unfinished, so the body is required.

## Write for a smart twelve-year-old

Short common words. One idea per line. Active voice. Name things exactly as the
scenario names them. Numbers as digits. If a line needs a second read, rewrite
it.

Words that never belong in a change line: leverages, orchestrates, seamlessly,
robust, asynchronous pipeline, fan-out, utilise, in order to. This holds in
whatever language you are writing.

## The same three changes, written well and written badly

Heading first, then the body after the slash.

| Write this | Not this |
| ---------- | -------- |
| Route now queues the job instead of sending / The API call finishes at once. A worker sends the mail later. | Broadcast fan-out moves behind the queue / The API route now enqueues broadcast jobs for asynchronous batch processing instead of sending emails inline. |
| Postmark now gets 500 emails per call / One call per batch instead of one call per person. | Batched delivery replaces single sends / The worker leverages the shared library to send emails in chunks of 500 via Postmark's batch endpoint. |
| Suspended users can no longer sign in / The login form returns "account suspended" and creates no session. | Authentication guard improvements / Enhanced the authentication flow to robustly handle suspended account states during the login process. |

## Ordering

The headline change is first. An overview of everything touched, if there is one,
is last. Keep lines about the same area together: a list that alternates between
two parts of the system spends the reader's attention on travel.

## What counts as a change

A behaviour change, an API change, an architecture change, a data-flow change, or
an addition. Something that is merely true of the system, and was true before,
is context rather than a change: include it only where a change line needs it to
make sense.

## Every line traces to a run

A change line claims what the system does, so it names the scenario that proves
it and carries that scenario's status. A change with no covering scenario is
written as "not covered by a scenario" rather than dropped, and never as a
finished feature. See the skill you came from for how to cite one.
