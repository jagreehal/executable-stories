---
name: spec-example-mapping
description: Use when refining requirements with examples, rules, and open questions before writing scenarios or story tests. Turns fuzzy conversations into structured specification material.
---

# Example Mapping for Executable Specifications

Turn conversations into rules, examples, and open questions before writing scenarios. If you write scenarios from vague requirements, you get vague tests. Example Mapping helps the team separate what it knows from what it is assuming.

## Agent guardrails

This skill guides what the executable specification should say. It is not an adapter API reference. Treat code examples as specification sketches; if an example uses `story.init(task)`, adapt it before editing non-Vitest adapters.

- Keep the implementation framework-native: `describe`/`it`/`test`, inline steps, and story/doc metadata.
- Do not introduce feature files, Gherkin parsing, regex step matching, or a world object.
- Vitest: use `story.init(task)` inside `it(..., ({ task }) => ...)`; never import a top-level `then`.
- Jest: use `story.init(options?)` inside `it(...)`; steps can be called as `story.given(...)` or top-level `given(...)`.
- Playwright: use `story.init(testInfo)`, or `story.init({ page }, testInfo)` when step callbacks need fixtures.
- Cypress: use `story.init()` inside `it(...)`; step functions live on the `story` object.
- Go: use `es.Init(t, "Scenario", opts...)`; configure `es.RunAndReport(m)` in `TestMain`.
- Ruby/Minitest: use `ExecutableStories.init("Scenario", ...)` and call steps on the returned story object.
- pytest: use `story.init("Scenario", ...)`; Python keyword collisions are `and_()` and `assert_()`.
- JUnit 5: use static `Story.init("Scenario", ...)`; Kotlin escapes the `when` call as ``Story.`when`("...")``.
- Rust: use `Story::new("Scenario")`; call `s.pass()` for passing tests and `executable_stories::write_results()` for output.
- xUnit: use `Story.Init("Scenario", ...)`; call `Story.RecordAndClear()` at the end of each test.

## The Cards

| Card colour         | What it holds                                               | When to write one                                                        |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Yellow** (Story)  | The feature or behaviour under discussion                   | Usually one per session — the thing you're specifying                    |
| **Blue** (Rule)     | A business rule that governs behaviour                      | When someone says "it should...", "we always...", "except when..."       |
| **Green** (Example) | A concrete instance that illustrates a rule                 | When you can fill in specific data — names, amounts, dates, states       |
| **Red** (Question)  | Something unresolved — an assumption, a gap, a disagreement | When you hear "I think...", "probably...", "I'm not sure...", or silence |

## How to run a session

1. Write the **story** (yellow) at the top.
2. Someone states a rule — write it on a blue card.
3. For each rule, ask "Can you give me an example?" — write it green, placed under its rule.
4. When an example doesn't fit any rule, you've found a new rule.
5. When nobody can give an example for a rule, promote it to a red question.
6. When two people disagree about an example, write a red question.
7. A useful stopping point is often 3-7 rules with 2-4 examples each and a short list of red questions.

## When to stop

- **Too many rules (>7):** The story is probably too big. Split it.
- **Too many questions (>3):** More than 3 unresolved questions is a warning sign. Pause and resolve the biggest unknowns first.
- **Too few examples (<2 per rule):** You haven't explored enough. Push for concrete data.
- **No questions at all:** You may be accepting assumptions too easily. Challenge each rule — "Is there any case where this isn't true?"

## Good examples are specific

| Quality | Example                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| Bad     | "A user with enough funds can withdraw cash"                                            |
| Good    | "Sarah has balance £500 and requests £100 — cash is dispensed and balance becomes £400" |

A good example includes concrete data, a clear action, and an observable outcome. If you can't fill in the specifics, you don't understand the rule well enough yet.

## From cards to scenarios

Only write scenarios when:

- the most important red questions are resolved or explicitly deferred
- each important rule has enough examples to show its boundaries
- the team agrees the rule set is stable enough to automate

Rules usually become scenario groups, `describe` blocks, or decision tables. Examples help identify the minimum useful set of scenarios. Some examples become standalone `it()` tests; others belong in `story.table()` examples, notes, or supporting documentation.

```ts
// Rule: "Withdrawals are declined when balance plus overdraft is insufficient"
describe('Insufficient funds decline', () => {
  // Example: balance £50, overdraft £200, requests £300 → declined
  it('declines when request exceeds balance plus overdraft', ({ task }) => {
    story.init(task);
    story.given('account holder "Sarah" has balance £50');
    story.and('overdraft facility is £200');
    story.when('Sarah requests £300');
    story.then('withdrawal is declined');
  });

  // Example: balance £0, no overdraft, requests £10 → declined
  it('declines any withdrawal with zero balance and no overdraft', ({
    task,
  }) => {
    story.init(task);
    story.given('account holder "Tom" has balance £0');
    story.and('no overdraft facility');
    story.when('Tom requests £10');
    story.then('withdrawal is declined');
  });
});
```

## Promoting assumptions into questions

Watch for hidden assumptions in conversations:

| What you hear              | What to write                                       |
| -------------------------- | --------------------------------------------------- |
| "I think it works like..." | Red question: "Does it actually work like X?"       |
| "Probably we should..."    | Red question: "Should we do X or Y?"                |
| "That never happens"       | Red question: "What happens if it does?"            |
| "We'll handle that later"  | Red question: "When? What's the interim behaviour?" |
| "Obviously..."             | Red question: challenge it — obvious to whom?       |
| Silence after a question   | Red question: nobody knows the answer               |

## Using examples to expose missing rules

When an example doesn't fit any existing rule, you've found a gap. Don't force it — create a new rule.

```text
Rule: "Cash is dispensed when sufficient funds"
  Example: balance £500, requests £100 → dispensed ✓
  Example: balance £500, requests £500 → dispensed ✓
  Example: balance £500, requests £100, but daily limit is £50 → ???

→ New rule: "Daily withdrawal limit applies regardless of balance"
```

The third example broke the first rule. That's the whole point — examples are cheaper than production incidents.

## Facilitation guidance

- Keep cards short — rewrite speeches into concise rules or examples.
- Prefer domain language over UI or implementation language.
- Ask for concrete examples whenever a rule sounds abstract.
- Park unresolved debates as red questions instead of arguing in circles.
- Split the story when the map mixes unrelated outcomes.

## Anti-patterns

### CRITICAL: Writing scenarios before the example map is stable

Symptom: Half the scenarios get rewritten after a conversation with the product owner. Fix: Don't open your editor until the important red questions are resolved and the team agrees the rules are right.

### HIGH: Rules without examples

Symptom: "Users must be authenticated" with no concrete examples of what happens when they're not. Fix: Every rule needs at least one confirming and one challenging example.

### HIGH: Examples without rules

Symptom: A list of 20 examples with no grouping. Fix: Sort examples under rules. Orphan examples reveal missing rules.

### MEDIUM: Never writing red questions

Symptom: The map looks clean but the scenarios are full of assumptions. Fix: Actively challenge every rule — "Is there any case where this isn't true?"

## Quick reference

| Principle                   | Rule                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| Rules first                 | Don't write scenarios until you have stable rules with examples    |
| Good examples are specific  | Concrete data, clear action, observable outcome                    |
| Questions are progress      | Red cards mean you're being honest about what you don't know       |
| Split big stories           | More than 7 rules usually means the story is too large             |
| Examples expose gaps        | An example that doesn't fit any rule is a new rule                 |
| Not every example is a test | Some become `it()` tests, others become table rows or notes        |
| Resolve before coding       | Open questions become spec debt if you write scenarios around them |
