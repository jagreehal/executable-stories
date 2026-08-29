---
name: spec-plan-to-stories
description: Use when a plan exists (a chat plan, a markdown plan, a PRD, another agent's plan) and the work has not started yet, in a repo that uses executable-stories. Turns the plan into planned story tests that appear in the report and burn down as the work lands, instead of a document that drifts.
---

# Plan To Stories

A plan in a chat window is invisible three days later. A plan in a markdown file is
visible and wrong: nothing tells you which parts shipped. Both fail the same way, by
having no connection to the thing that knows the truth, which is the test run.

This skill converts a plan into **planned scenarios**: declarations that show up in the
report marked *(planned)* and stop being planned the moment someone implements them.
The plan and the progress bar become the same artifact.

Every adapter can record one, but the syntax is the host's own. Read the Support table
below and write the form that matches the suite in front of you. Writing `it.todo` into
a Go or pytest suite produces code that does not compile or run.

Use it when the plan is about behaviour. A plan about a refactor with no behaviour
change has nothing to convert; say so and stop.

## Agent guardrails

- Never write an assertion you have not run. A `todo` is an honest promise; a green
  test that asserts nothing is a lie the report will repeat to everyone.
- Do not convert a plan you have not read in full, and do not invent scope the plan
  does not contain. If the plan is ambiguous about a behaviour, that ambiguity becomes
  an open question, not a scenario you guessed.
- Every adapter can record a planned scenario, but the idiom differs by language (see Support below). Use the one the host framework gives you.

## The conversion

1. **Read the plan and the existing scenarios.** `executable-stories list reports/by-file
   --list-format json` tells you what already exists. A plan item already covered by a
   passing scenario is done, not planned. Say so rather than duplicating it.
2. **Split the plan into behaviours a user could observe.** One scenario per behaviour,
   in the plan's own vocabulary. If a plan item cannot be phrased as something observable,
   it is a task, not a scenario, and it does not belong here.
3. **Declare them** in the file where they will eventually live, so the implementer
   finds them in place. Use the host's own form (Support table below). Vitest or Jest:

   ```ts
   // src/checkout/suspension.story.test.ts
   describe('Suspended accounts', () => {
     it.todo('checkout is blocked for a suspended account');
     it.todo('the suspension notice names the support contact');
   });
   ```

   Playwright: `test.fixme('checkout is blocked for a suspended account', async () => {});`
   Cypress: `it('checkout is blocked for a suspended account');`

   Go, Ruby, Rust, pytest, JUnit 5, and xUnit take an explicit call instead, one per
   test, in an otherwise empty test:

   ```go
   func TestCheckoutBlocksSuspendedAccount(t *testing.T) {
       es.Planned(t, "checkout is blocked for a suspended account")
   }
   ```

   ```python
   def test_checkout_blocks_suspended_account():
       story.planned("checkout is blocked for a suspended account")
   ```

   No steps, no assertions, no `story.init`. The declaration is the whole test.
4. **Attach the plan's context** to one story in the same file, so the reasoning travels
   with the work rather than living in a document. Written here in Vitest; use your own
   adapter's story API, which carries the same doc methods:

   ```ts
   it('suspension plan', ({ task }) => {
     story.init(task);
     story.section({ title: 'Plan', markdown: '<the plan, in prose>' });
     story.custom({
       type: 'file-tree',
       data: {
         authored: 'agent',
         title: 'Expected to change',
         files: [
           { path: 'src/checkout/guard.ts', change: 'added' },
           { path: 'src/checkout/index.ts', change: 'modified' },
         ],
       },
     });
     story.mermaid({ title: 'Checkout with the guard', code: '...' });
     story.given('this plan was agreed on <date>');
     story.then('the todo scenarios below describe the work');
   });
   ```

   Mark every block you authored with `authored: "agent"`. It renders as "AI-authored,
   not verified by a run", which is exactly what a plan is: a claim about the future,
   with no run behind it. `skills/explain-change` documents the block payloads.
5. **Record what you could not answer.** Open questions go in the `story.section` prose
   as a list, not into invented scenarios. A question you guessed at is worse than a
   question you left visible.
6. **Show the burn-down.** `executable-stories list reports/by-file --list-format json`
   after each run: planned scenarios carry `planned: true` in the StoryReport, and the
   markdown report suffixes them with *(planned)*. The count going down is the progress
   report, and nobody has to maintain it.

## Support

| Adapter    | How to declare a planned scenario                                          |
| ---------- | -------------------------------------------------------------------------- |
| Vitest     | Bodyless `it.todo('...')`                                                  |
| Jest       | Bodyless `it.todo('...')`                                                  |
| Playwright | `test.fixme('...', async () => {})`                                        |
| Cypress    | Bodyless `it('...')`, via the Mocha reporter path                          |
| Go         | `es.Planned(t, "...")` in an otherwise empty test                          |
| Ruby       | `ExecutableStories.planned("...")`                                         |
| Rust       | `Story::planned("...")`                                                    |
| pytest     | `story.planned("...")`                                                     |
| JUnit 5    | `Story.planned("...")`                                                     |
| xUnit      | `Story.Planned("...")`                                                     |

For the four JS frameworks, the file must also contain real story tests. That rule is
deliberate: a plain suite full of todos does not leak into generated docs. If your plan
file has no story tests yet, the context story from step 4 satisfies it.

The six non-JS adapters take an explicit call rather than reusing `t.Skip`, `@Disabled`,
`#[ignore]`, or `Skip = "..."`. Those all mean "do not run this now", which is a
different claim from "we have not built this yet", and conflating them would drop every
quarantined test into your plan. Cypress reads a bodyless `it` only through the Mocha
reporter; the `cypress.run()` module API cannot tell a bodyless test from `it.skip`.

## When the work lands

The implementer replaces the declaration with a real story test: the `it.todo`, the
`test.fixme`, or the `Planned(...)` call becomes a test that calls `story.init` and
records steps. Nothing else to update, because the scenario stops being planned the
moment it runs. Two things are worth doing at that
point:

- Delete the plan blocks that are now wrong, or restate them as an explainer with
  `skills/explain-change` where the citations come from the run instead of your guess.
- Check whether the shipped behaviour matches what the plan promised. `executable-stories
  compare --format changelog` against the pre-plan baseline shows what actually appeared.

## Relationship to neighbouring skills

- `spec-discovery-oopsi`, `spec-example-mapping`, `spec-outside-in-behaviour` produce the
  behaviours. Use them when the plan is thin; this skill assumes the thinking is done.
- `spec-refine-examples` sharpens a vague scenario title into a precise one. Run it over
  the declarations if they read like tasks rather than behaviours.
- `explain-change` is the reverse direction: it explains work that already ran, with
  citations. A plan has no citations, and pretending otherwise is the one mistake this
  skill exists to prevent.
