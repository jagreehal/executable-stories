---
name: spec-evidence-review
description: Layers an evidence discipline over the per-framework story API so each AI-authored change is communicated with proof — declared change-type, intent/approach, and a test whose pass is credible — for the Evidence Review report. Use when authoring or reviewing changes surfaced through `executable-stories review` or the action's `mode: review`, or when the user mentions evidence review, reviewing AI changes by behaviour and proof, change-type tags, or evidence-graded tests.
---

# Authoring for Evidence Review

The Evidence Review report (`executable-stories review`, or the GitHub Action in `mode: review`) reframes a test run as **communication with evidence** for reviewing AI-authored changes: intent, approach, proof, outcome — where the proof is that the test passes, *graded by how credible that pass is*. The reviewer reads the report instead of the diff; the diff becomes the appendix.

This skill is the authoring discipline that makes that report worth reading. It sits **on top of** the per-framework story API skills (vitest/jest/playwright/etc.) — it does not replace them. Write normal framework-native story tests, then apply the rules below so the report can communicate each change with proof.

## Agent guardrails

- Keep everything framework-native: `describe`/`it`/`test`, inline steps, story/doc metadata. No feature files, Gherkin parsing, regex step matching, or a world object.
- This skill adds **no new API**. Everything below uses existing primitives: tags, `story.section`, `story.note`, file naming, screenshots, OTEL. Adapt step syntax to the host framework (e.g. Vitest `story.init(task)` inside the callback; never import a top-level `then`).
- Do not fabricate evidence. A refactor with no behaviour change must NOT get a fake assertion — its evidence is "the existing tests still pass" (see the change-type table).

## The unit is the claim, not the diff line

Group your work into **claims**. A claim is one story/scenario that asserts something about the change. One behaviour may span many files (one claim, many diffs); a rename touches many lines but makes no claim about behaviour. Each claim declares its **change-type** and carries **type-appropriate evidence**:

| Change-type (`change:*` tag) | The proof a reviewer expects |
| --- | --- |
| `change:feature` | A new passing story test for the new behaviour |
| `change:bugfix` | A test that was **red on the bug, green after the fix** (failing-first) |
| `change:refactor` | The existing stories still pass (behaviour preserved) — no new assertion invented |
| `change:perf` | A benchmark / before-after number, or an OTEL span-duration delta |
| `change:deps` | Statement of intent + the affected stories still pass |

## The five rules

### 1. Declare the change-type with a `change:*` tag

Tag each story so the report can group and grade it. Recognised values: `change:feature`, `change:bugfix`, `change:refactor`, `change:perf`, `change:deps`. Untagged claims render as "unknown".

```ts
it('checkout blocks a suspended user', ({ task }) => {
  story.init(task);
  story.tag(['change:feature']);
  // ...
});
```

### 2. Write the *Why* as a section (intent + approach)

The report pulls the intent narrative from a doc `section` whose title matches **why / intent / approach / rationale / reasoning** (falling back to the first `note`). State what changed and *why*, not how the code works.

```ts
story.section({
  title: 'Why',
  markdown:
    'Suspended accounts could still complete checkout. We now block at the order gate, '
    + 'because the suspension flag is only authoritative server-side.',
});
```

### 3. Let file location pick the audience — don't fight it

Audience is **derived from the file**, no tagging needed:

- `*.e2e.*`, an `e2e/` folder, or a Playwright `*.spec.*` → **stakeholder** (behaviour + proof a product owner reads)
- colocated `*.test.*` / `*.int.test.*` → **engineer** (intent + internal-contract evidence)

So put behaviour the business cares about in an e2e/spec file, and unit/integration detail in colocated tests. Override only when truly needed with an `audience:stakeholder` or `audience:engineer` tag.

### 4. Make the evidence credible — a green tick is the *weakest* proof

A passing self-authored unit test grades **weak**. Strength climbs toward tamper-resistant or constraint-proving evidence. Reach for the strongest the change warrants:

- **Stakeholder claims**: attach a real **screenshot** and/or an **OTEL trace** (autotel). A rendered page or a completed span is hard to fake — it grades **strong**.
- **Bugfixes**: do failing-first (rule 5) — it grades **strong** because it proves the test constrains the fix.
- **Mutation score / changed-line coverage**: if the project runs Stryker/PITest/coverage, those scores are ingested and raise strength. You don't run them; just don't undermine them with assertion-free tests.
- **Integration tests** (`*.int.test.*`): grade **moderate** over a bare unit assertion.

### 5. Bugfixes: write the test first and watch it fail

For `change:bugfix`, follow red→green: write the test, confirm it **fails on the current (buggy) code**, then fix until green. State the failing-first step in your *Why* section. This is the single most credible cheap signal a reviewer can get — it proves the test would catch the bug's return.

## Worked example

```ts
// src/cart/checkout.e2e.spec.ts  → stakeholder audience (e2e/spec)
it('checkout blocks a suspended user', ({ task }) => {
  story.init(task);
  story.tag(['change:bugfix']);
  story.section({
    title: 'Why',
    markdown:
      'Suspended users could pay (PAY-1042). Wrote this e2e first, confirmed it failed '
      + 'on main, then gated the order. Failing-first verified.',
  });
  story.given('a suspended account "Sarah"');
  story.when('Sarah submits valid payment');
  story.then('checkout is blocked with a suspension notice');
  story.screenshot({ path: 'artifacts/checkout-blocked.png', alt: 'blocked checkout' });
});
```

This claim renders as **stakeholder · bugfix · 🟢 strong** (failing-first + screenshot), with the *Why* shown inline — exactly what a reviewer needs to accept the change without reading the diff.

## What the report does with this

- **Bands changed files**: 🔴 changed code with no claim/test (review this first) → 🟡 weak evidence → 🟢 strong. Untested changed source is the reviewer's first stop.
- **Segments by audience**: stakeholder behaviour on top, engineer detail below.
- **Grades each claim** and shows *why* that strength was assigned.

## Self-check before calling a change done

- Does every behavioural change have a claim with a `change:*` tag?
- Does each claim's *Why* explain intent, not implementation?
- Is stakeholder behaviour in an e2e/spec file, with a screenshot or trace?
- Did bugfixes go red→green, and does the *Why* say so?
- Are refactors backed by "existing stories still pass" — with no invented assertions?
- Run `executable-stories review <run.json> --changed-files <diff>` (or open the PR with the action in `mode: review`): is anything in the 🔴 uncovered band that should have a claim?
