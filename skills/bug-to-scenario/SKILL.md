---
name: bug-to-scenario
description: Use when a bug is reported (an issue, a support ticket, a stack trace, a "it does the wrong thing when…") in a repo that uses executable-stories. Turns the report into a failing scenario that reproduces it, drives the fix from that scenario, and leaves the reproduction behind as permanent documentation of what the system now guarantees.
---

# Bug To Scenario

A fixed bug usually leaves two things behind: a commit nobody reads, and a regression
test named `test_fix_for_1042`. Six months later the commit is invisible and the test
name tells the next reader nothing about what the system promises.

This skill spends the same effort differently. The reproduction becomes a scenario in
the reader's language, so the fix ships as a line in the living documentation:
*"a refund is rejected when the original payment was already reversed"*. Support can
read it. QA can see it is covered. The next agent to touch that code sees the guarantee
before it breaks it.

## First, is this a story suite?

The reproduction takes the shape of whatever the suite around it is. Check before writing
one: `find . -name "*.story.test.*"` against the test count tells you quickly.

- **A story suite** (product behaviour, read by people who are not engineers): follow the
  whole skill. The reproduction becomes stakeholder-visible documentation.
- **A plain unit suite** (a library's internals, a pure function, a parser): keep steps
  2's naming rule, step 4, and step 5, and drop the rest. Tags, `covers`, `ticket`,
  `story.state`, and the artifact commands have no audience here, and a lone story test
  in a directory of 89 plain ones is noise, not documentation.

What survives in both cases is the discipline, not the API: reproduce before fixing, name
the test as the guarantee rather than the defect, assert the invariant and not just the
symptom, and check the sibling callers before editing one.

## Agent guardrails

- **Reproduce before you fix.** A fix with no failing scenario behind it is a guess. If
  you cannot reproduce it, that is a finding to report, not a reason to change code.
- **The reproduction must fail for the reported reason.** A scenario that fails because
  the fixture is wrong will go green when you fix the fixture, and the bug will still be
  there.
- **Fix the root cause, not the reported path.** The report names one symptom. Before
  editing, find every caller that routes through the same code and decide whether they
  share the defect. One guard in the shared function beats a guard per caller.
- **Never delete or skip the scenario after the fix.** It is the documentation now. The
  ratchet in `executable-stories goal --baseline` exists to catch exactly that move.

## The sequence

### 1. Read the report, then find what the suite already claims

Before touching source, find out what the suite already says about this area. In a story
suite that is the scenario index; in a plain unit suite it is the test file covering the
function, which is the one time reading tests beats reading artifacts.

```bash
executable-stories list reports/by-file --list-format json
```

Three outcomes, and they lead to different work:

| What you find | What it means | What to do |
| --- | --- | --- |
| A passing scenario that covers the behaviour | The scenario is wrong, or too shallow to catch this | Sharpen the existing scenario; do not add a second one beside it |
| A failing scenario that already describes it | It is known, not new | Add the report to that scenario's ticket and stop |
| Nothing covers it | A genuine gap | Write the reproduction below |

### 2. Write the reproduction as a scenario

Name it as a guarantee, not as a defect. "Refund is rejected when the payment was
already reversed" outlives "fix double refund bug", because it stays true after the fix.

Carry the report's own data. A bug report's value is its specifics: the amount, the
sequence, the state the record was in.

```ts
it('refund is rejected when the payment was already reversed', ({ task }) => {
  story.init(task, {
    tags: ['capability:refunds', 'criticality:revenue'],
    covers: ['src/payments/refund.ts'],
    ticket: 'PAY-2210',
  });

  story.given('a payment of £42.00 that has already been reversed');
  story.state({ label: 'Payment before the refund', value: reversedPayment });

  story.when('a refund is requested for the full amount');
  story.then('the request is rejected and the balance is unchanged');

  const result = refund(reversedPayment, { amount: 4200 });
  expect(result).toEqual({ ok: false, reason: 'already-reversed' });
  expect(ledgerBalance()).toBe(0);
});
```

`story.state` earns its place here more than anywhere else. Most bugs are a record in an
unexpected state, and a before/after snapshot says in one block what three prose
sentences fumble.

Assert the *invariant that was violated*, not only the symptom. The report says "the
customer was refunded twice"; the invariant is "the ledger balance does not move". Assert
both, or the fix can satisfy the symptom while leaving the invariant broken.

### 3. Capture the red run as a baseline

Run the suite and keep the failing run. It is the evidence that the fix did something:

```bash
pnpm test
cp reports/raw-run.json reports/before-fix.json
executable-stories check reports/raw-run.json
```

Confirm from `check` that the scenario fails at the step you expected, with the error the
report described. If it fails at the `given`, your setup is wrong, not the product.

### 4. Find the root cause, then fix

Work from the failing step outwards. `check` prints the product code the scenario covers,
which is the honest starting point. Grep every caller of the function you are about to
change before you change it: if three call sites share the defect and you patch one, you
have shipped two more bug reports.

If the root cause is elsewhere than the reported symptom, say so in the scenario. A
`story.note` on the step is enough.

### 5. Prove the fix behaviourally

```bash
pnpm test
executable-stories compare reports/before-fix.json reports/raw-run.json --format changelog
```

The changelog shows the scenario moving from failing to passing, and shows anything else
that moved with it. That second part matters: a fix that turns one scenario green and
another red is not a fix, and the diff is the only place that shows up in one view.

### 6. Leave the documentation behind

Two edits, both small, both easy to skip:

- **Link the ticket.** `ticket: 'PAY-2210'` on the story puts the scenario in the
  traceability matrix, so the requirement side of the audit is answered too.
- **Tag for the readers who care.** `criticality:revenue` for risk weighting, `support`
  if a customer-facing agent needs to know the answer to "what happens if…".
  `audience-views` covers the vocabulary.

## When the bug cannot be fixed now

Do not delete the scenario and do not `skip` it. Record it honestly:

```ts
story.tag(['known-issue']);
story.but('the receipt still shows the original amount (PAY-2213)');
```

A `known-issue` scenario documents a deliberate limitation to support and QA, which is
strictly better than a silent gap. If the whole behaviour is unbuilt rather than broken,
declare it planned instead (`spec-plan-to-stories`).

## Bugs found by an agent rather than a person

Same sequence, one extra obligation: an agent that reports a bug must produce the failing
scenario as its evidence. A bug report with no reproduction is a hypothesis, and it goes
in the ticket as a hypothesis, not into the report as a claim about the system.

## Relationship to neighbouring skills

- `failure-triage` decides which of the failures in a red run deserve this treatment.
  Run it first when the suite has many failures; run this when you have one bug.
- `story-tdd` is the same loop for a feature. Everything about the red step applies here.
- `spec-evidence-review` attaches the fix to a reviewable claim when the change ships
  through the Evidence Review report.
- `explain-change` writes up the fix for readers who need to understand it, citing this
  scenario as the proof.
