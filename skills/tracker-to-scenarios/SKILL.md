---
name: tracker-to-scenarios
description: Use when work arrives as a tracker ticket — a Jira issue, a GitHub issue, a Linear ticket — and it has to become scenarios before anyone writes code. Reads the ticket through MCP, checks the suite for what already covers it, grills what the ticket does not say, and lands planned scenarios that carry the ticket id. The suite stays the source of truth; the ticket gets a pointer to it.
---

# Tracker To Scenarios

A ticket is where intent arrives. A scenario is where intent becomes checkable. Most teams
have both and no edge between them, so the ticket says "handle suspended accounts", the
suite says `suspension.story.test.ts`, and only the person who wrote both knows they are
the same thing.

This skill builds that edge at the moment the work starts, in the one direction that is
safe: **tracker → suite**. The scenarios are the specification. The ticket carries a
pointer to them and a record of who asked.

For the return trip — proving a ticket and stamping it with a receipt — use
`tracker-receipts`.

## What you need

An MCP server for the tracker, connected in whatever agent you are running. This skill is
agent-agnostic: once a tool for reading issues exists, the workflow is identical.

| Tracker | Server | Notes |
| --- | --- | --- |
| Jira / Confluence | [`atlassian/atlassian-mcp-server`](https://github.com/atlassian/atlassian-mcp-server) | Follow its README for the endpoint and OAuth setup; do not guess the URL |
| GitHub Issues | GitHub's MCP server | Issues, comments, and linked PRs |
| Linear | `https://mcp.linear.app/mcp` | Interactive OAuth on first use |

No MCP server available? The workflow still holds — paste the ticket body and comments
into the conversation instead. What you must not do is invent the ticket's contents.

## Workflow

### 1. Read the whole ticket, comments included

Fetch the issue through MCP: title, description, acceptance criteria, labels, linked
issues, and **every comment**. On a real tracker the description is six months old and the
decision that matters is in comment fourteen. A ticket whose comments contradict its
description is not a specification yet; it is a grilling target (step 3).

### 2. Read the suite before you write anything

```bash
executable-stories list reports/by-file --list-format json
```

Three questions, in order:

- **Does a scenario already cite this ticket?** Look at `tickets[].id`. If one does, this
  is an amendment, not a new spec — read what it already proves before adding to it.
- **Does the behaviour already exist under another name?** Search titles and step text for
  the ticket's nouns. A duplicate scenario is worse than a missing one: two specs that
  disagree, and no signal about which is current.
- **What vocabulary does the suite use?** Write the scenarios in the project's words, not
  the ticket's. A ticket says "user"; the suite may say "account holder"
  (`spec-domain-language`).

Report a duplicate back to the user rather than quietly writing the scenario anyway.

### 3. Sharpen what the ticket does not say

A one-line ticket is not acceptance criteria, and the gap is not yours to fill by
invention. Two routes:

- The requester is in the conversation → `spec-grilling`. Ask the whole frontier in one
  round with a recommendation attached to each question.
- The requester is elsewhere → `spec-questionnaire`. Package the open questions for them
  and post it as a ticket comment, so the answers land where the next reader finds them.

Never turn a ticket's prose into scenario titles unchanged. "As a user I want to be able to
manage suspensions" is a wish, not a behaviour. The scenario says what is true when it
works: `checkout is blocked for a suspended account`.

### 4. Write planned scenarios where they will live

Declare them in the file that will eventually hold them, using the host's own idiom
(`spec-plan-to-stories` has the form for each of the eleven adapters):

```ts
// src/checkout/suspension.story.test.ts
describe('Suspended accounts', () => {
  it.todo('checkout is blocked for a suspended account');
  it.todo('the suspension notice names the support contact');
  it.todo('a lifted suspension restores checkout on the next attempt');
});
```

They appear in the report marked *(planned)* and burn down as the work lands.

### 5. Link both directions

**Suite → ticket.** A planned scenario has no `story.init`, so it cannot carry a ticket id:
that link becomes machine-readable only when someone implements it. Attach the ticket to
the context story in the same file now, and say plainly in your summary that the implementer
adds it to each scenario as it lands:

```ts
it('suspension plan', ({ task }) => {
  story.init(task, { ticket: 'PAY-1042', tags: ['planned'] });
  story.section({ title: 'From PAY-1042', markdown: '<the decisions, not the ticket prose>' });
});

// …and when a todo becomes real:
it('checkout is blocked for a suspended account', ({ task }) => {
  story.init(task, { ticket: 'PAY-1042', covers: ['src/checkout/suspension.ts'] });
});
```

Set `ticketUrlTemplate` in the reporter config once (`https://acme.atlassian.net/browse/{ticket}`)
and every report links the id back without anyone pasting URLs.

**Ticket → suite.** Post one comment naming the planned scenarios and the file they live
in, under a stable marker so a later run updates it in place rather than stacking:

```md
<!-- executable-stories:planned ticket=PAY-1042 -->

**Planned scenarios** — `src/checkout/suspension.story.test.ts`

- [ ] checkout is blocked for a suspended account
- [ ] the suspension notice names the support contact
- [ ] a lifted suspension restores checkout on the next attempt

These are the acceptance criteria in executable form. They currently read *(planned)* in
the report and turn green as the work lands.
```

### 6. Confirm before writing to the tracker

Show the target issue and the exact comment text, then wait. Post a comment; never edit the
description, the acceptance-criteria field, the status, or the assignee. Those belong to
whoever runs the board, and an agent that rewrites them teaches people to distrust the
whole bridge.

## What good output looks like

- Planned scenarios in the file where the work will happen, in the project's vocabulary.
- The ticket id on the context story, and a stated hand-off rule for the implementer.
- One ticket comment listing those scenarios, under a marker.
- An open-question list for anything the grilling did not settle, attached to the feature
  rather than left in chat.

## When it goes wrong

- **The ticket is an implementation request.** "Add a `suspended` column" has no observable
  behaviour. Ask what becomes true for a person when it ships, and write that.
- **The ticket is an epic.** Ten scenarios in one file that nobody can implement in one
  sitting. Split it into tickets first (`spec-story-mapping`), and grill one slice.
- **The ticket is already done.** Then you are documenting, not planning: write real
  scenarios that pin the current behaviour (`spec-convert-tests`) and mark anything you
  inferred rather than confirmed with `authored: "agent"`.
- **The acceptance criteria are UI copy.** "Button says Retry" is a fixture detail, not a
  behaviour. Keep the behaviour in the title and the copy in a doc entry.
- **Nobody can answer the open questions.** The ticket has no owner. That is the finding —
  report it rather than picking answers so the work can start.

## Relationship to neighbouring skills

- `spec-grilling` and `spec-questionnaire` fill the gaps a thin ticket leaves.
- `spec-plan-to-stories` owns the planned-scenario form for every adapter.
- `story-tdd` takes a planned scenario and drives it red-to-green.
- `tracker-receipts` closes the loop: proves the ticket from a run and stamps it.
- `linear-evidence-review` is the Linear-specific receipt path that came first.
- `test-management-bridge` is the adjacent problem: TestRail or Xray mirroring the suite.
