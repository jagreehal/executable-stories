---
name: story-tdd
description: Use when building a behaviour test-first in a repo that uses executable-stories. Runs red-green-refactor with a story test as the red step, so the failing test is a published promise in the report and the loop has a machine-checkable stopping condition instead of a feeling.
---

# Story TDD

Ordinary TDD keeps the red test private. It lives on your machine for ten minutes and
nobody else ever sees it. Here the failing test is already in the report, already named
in the reader's language, already visible to whoever opens the docs site. That changes
what the red step is for: it is not a scratch assertion, it is the promise you are about
to keep.

Three things follow from that, and they are the whole skill:

- **The scenario title is written for the reader, before the code exists.** If you
  cannot say what the system will do in one sentence a non-engineer understands, you do
  not yet know what to build, and no amount of implementation will fix that.
- **Red must be red for the right reason.** A test that fails because of a typo, a
  missing import, or an unset fixture proves nothing. Read the failure before you write
  a line of production code.
- **The loop has a verdict, not a vibe.** `executable-stories goal` answers "am I done"
  with an exit code. Use it instead of deciding for yourself.

## Agent guardrails

- Never write an assertion you have not watched fail. A green test that asserts nothing
  is worse than no test, because the report repeats the lie to everyone who reads it.
- Do not attach doc entries describing behaviour until the scenario is green. Before
  then it is a plan, and plans belong in `it.todo` (`spec-plan-to-stories`) or in a
  `story.section` marked `authored: "agent"`.
- Do not weaken a scenario to reach green. Deleting a step, loosening an assertion, or
  renaming a scenario away from its promise is caught by the ratchet in `goal` with a
  `--baseline`, and it should be.
- Keep it framework-native. `story.init` inside the host's own `it`/`test`, steps inline.
  Per-adapter init syntax lives in `skills/spec-shared/AGENT-GUARDRAILS.md`.

## The loop

### 1. Name the behaviour

One scenario, one observable behaviour, phrased as an outcome. "Checkout is blocked for
a suspended account", not "test suspension guard". If you have several, declare the rest
as planned scenarios now so the work is visible and burns down:

```ts
describe('Suspended accounts', () => {
  it.todo('the suspension notice names the support contact');
});
```

### 2. Write the story, watch it fail

Write the whole scenario, steps included, against code that does not exist yet.

```ts
it('checkout is blocked for a suspended account', ({ task }) => {
  story.init(task, {
    tags: ['capability:checkout', 'audience:stakeholder'],
    covers: ['src/checkout/guard.ts'],
    ticket: 'PAY-1042',
  });
  story.given('an account in good standing has items in the basket');
  story.when('the account is suspended');
  story.then('checkout returns a blocked result naming the reason');
  expect(checkout(suspendedAccount)).toEqual({ blocked: true, reason: 'suspended' });
});
```

Set `covers` at this point, not later. It is what makes the failure routable: `triage`
prints the product code each failing scenario touches, and a failure with no `covers` is
flagged as unroutable.

Run the suite, then read the failure properly:

```bash
pnpm test
executable-stories check reports/raw-run.json
```

`check` collapses the passing scenarios to a count and expands each failing one into its
Given/When/Then, the step that broke, the error, and the code it covers. It exits 5 while
anything is failing, so it is safe to put directly in a loop. Confirm the failure is the
one you intended. A `ReferenceError` is not a red test, it is a broken file.

### 3. Write the smallest code that turns it green

Nothing speculative. The scenario is the specification and it is the whole
specification. If the implementation wants to grow past what the scenario asks for, that
growth needs its own scenario first.

### 4. Refactor against the same green

Refactor with the scenario green and the steps unchanged. If a refactor forces a step
edit, you changed behaviour, not structure. Either stop and write the new scenario, or
undo it.

### 5. Ask whether you are done

```bash
executable-stories goal reports/raw-run.json \
  --require-tickets PAY-1042 --baseline auto --goal-format json
```

Exit 0 means met: the required scenarios pass, nothing regressed, and nothing was
removed, disabled, or had steps deleted since the baseline. Exit 5 means keep going. In
an agent loop this is the stopping condition, and it is deliberately not "the tests
passed on my machine" — a suite can pass because someone deleted the awkward test.

Scope the goal with `--require-tags`, `--require-tickets`, or `--require-scenarios`.
With none of them, the goal is "every scenario passes", which is usually too coarse for
a single behaviour.

## Choosing the seam

Test at the highest seam that still fails fast. A scenario written against an HTTP
handler documents a capability; the same scenario written against a private helper
documents an implementation detail, and it will be deleted in six months by someone
refactoring, taking the documentation with it.

Prefer an existing seam to a new one. Every new seam is a new thing to keep honest, and
the report will show it to readers who did not ask for it.

## When the behaviour needs several scenarios

Drive the happy path first, then each rule as its own scenario. Resist folding rules
into one long test with five assertions: the report renders one line per scenario, so
five rules in one scenario is four rules nobody can see. `spec-rules-decision-tables`
covers how to split rule-heavy behaviour, and `spec-workflow-state` covers multi-step
flows.

## Relationship to neighbouring skills

- `spec-plan-to-stories` declares work you have not started. This skill starts it. The
  handover is one `it.todo` becoming one real story test.
- `bug-to-scenario` is the same loop entered from a defect rather than a feature. The
  red step there is a reproduction, and it must fail for exactly the reported reason.
- `agent-loop` wires `triage` → work → `check` → `goal` for an autonomous session. This
  skill is what happens inside a single iteration of it.
- `spec-discovery-oopsi` and `spec-outside-in-behaviour` decide *which* behaviour to
  drive. Load one of them when step 1 is hard.
- `spec-review` critiques scenarios once they exist. Run it before you call a feature
  finished.
