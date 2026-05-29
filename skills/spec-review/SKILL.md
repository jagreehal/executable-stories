---
name: spec-review
description: Use when reviewing existing scenarios, story tests, or specifications for clarity, coverage, rule separation, and maintainability. Provides a structured critique checklist.
---

# Executable Specification Review

Review existing scenarios and story tests for quality, clarity, and coverage. This skill turns a vague "looks fine" into a structured critique.

## Agent guardrails

This skill guides what to inspect and report. It is not an adapter API reference. Treat code examples as specification sketches; if an example uses `story.init(task)`, adapt it before editing non-Vitest adapters.

- Keep the implementation framework-native: `describe`/`it`/`test`, inline steps, and story/doc metadata.
- Do not suggest feature files, Gherkin parsing, regex step matching, or a world object.
- Vitest: use `story.init(task)` inside `it(..., ({ task }) => ...)`; never import a top-level `then`.
- Jest: use `story.init(options?)` inside `it(...)`; steps can be called as `story.given(...)` or top-level `given(...)`.
- Playwright: use `story.init(testInfo)`, or `story.init({ page }, testInfo)` when step callbacks need fixtures.
- Cypress: use `story.init()` inside `it(...)`; step functions live on the `story` object.
- Go: use `es.Init(t, "Scenario", opts...)`; configure `es.RunAndReport(m)` in `TestMain`.
- Ruby/Minitest: use `ExecutableStories.init("Scenario", ...)` and call steps on the returned story object.
- pytest: use `story.init("Scenario", ...)`; Python keyword collisions are `and_()` and `assert_()`.
- JUnit 5: use static `Story.init("Scenario", ...)`; Kotlin escapes the `when` call as ``Story.`when`("...")``.
- Rust: use `Story::new("Scenario")`; call `s.pass()` for passing tests and `collector::write_results()` for output.
- xUnit: use `Story.Init("Scenario", ...)`; call `Story.RecordAndClear()` at the end of each test.

## When to use this

- After writing scenarios, before calling them done
- During code review of story test files
- When tests keep breaking and you suspect a spec problem, not a code problem
- When onboarding someone who asks "what does this test actually check?"

## The review checklist

Work through these in order. Stop early if you find a critical issue — fix it before continuing.

### 1. Outcome clarity

| Check                                                | Pass                                                   | Fail                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| Can you state the feature's purpose in one sentence? | The `describe` block name says what value is delivered | Name is mechanical ("test user service") or too vague ("user stuff") |
| Does the test file name signal what it specifies?    | `checkout-pricing.story.test.ts`                       | `test-3.test.ts`                                                     |

### 2. Scenario focus

| Check                                                                        | Pass                                               | Fail                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Does each scenario test one rule or one output?                              | "Declines when balance insufficient"               | "Tests withdrawal logic" (what specifically?)                   |
| Can you explain what this scenario adds without referencing other scenarios? | It stands alone                                    | "This one is like the previous one but with a different amount" |
| Scenario title reads as behaviour, not implementation?                       | "Applies staff discount over promotional discount" | "Calls calculateDiscount with staffFlag=true"                   |

### 3. Given/When/Then hygiene

| Check                                              | Pass                              | Fail                                                             |
| -------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Givens describe state, not actions?                | "Account has balance £500"        | "User deposits £500" (that's a When)                             |
| There is exactly one When (or one logical action)? | "User requests withdrawal"        | Three Whens interleaved with Thens                               |
| Thens describe outcomes, not implementation?       | "Withdrawal is declined"          | "Error code 402 is returned" (too low-level for a business spec) |
| But is used for contrast, not as a second Then?    | "But no email is sent" (contrast) | "But balance is updated" (that's just another outcome — use And) |

### 4. Duplication

| Check                                                          | Pass                                           | Fail                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Givens are not copy-pasted across scenarios?                   | Shared setup in a `beforeEach` or data persona | Same 5 Given lines in 8 scenarios                                          |
| Are near-duplicate scenarios actually testing different rules? | Different rule, similar setup                  | Same rule, slightly different numbers (should be a parameterised scenario) |
| Could a decision table replace several similar scenarios?      | Unique rule per scenario                       | 6 scenarios that vary only by input/output                                 |

### 5. Coverage

| Check                          | Pass                                                    | Fail                                          |
| ------------------------------ | ------------------------------------------------------- | --------------------------------------------- |
| Happy path exists?             | At least one passing scenario                           | Only edge cases, no baseline                  |
| Error paths exist?             | Scenarios for each known failure mode                   | Only the happy path                           |
| Boundaries tested?             | Scenarios at threshold values                           | Tests at round numbers that aren't boundaries |
| Concurrency/timing considered? | Scenarios for simultaneous or late events (if relevant) | Only sequential, single-actor flows           |

### 6. Documentation value

| Check                                          | Pass                                                            | Fail                                                  |
| ---------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Would a non-developer understand the scenario? | Business language, named personas                               | Code jargon, anonymous test data                      |
| Doc entries add context, not noise?            | `story.table()` showing the rule, `story.note()` explaining why | `story.json()` dumping the entire request payload     |
| Tags help find related scenarios?              | `story.tag('pricing', 'discount')`                              | No tags, or meaningless tags like `story.tag('test')` |

## Red flags

These patterns indicate deeper problems:

| Red flag                                  | What it usually means                                | Fix                                                        |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| >8 Givens in one scenario                 | Multiple rules tangled together                      | Split into separate scenarios, one rule each               |
| Scenario title starts with "Test that..." | Thinking in test code, not behaviour                 | Rewrite as "Declines when...", "Applies X to..."           |
| Every scenario has the same When          | The When is not the interesting part — the rules are | Focus scenarios on rule variations, not action variations  |
| `and()` used for important non-occurrence | Missing contrast — what should NOT happen?           | Use `but()` only for meaningful contrast or non-occurrence |
| story.json() with >20 fields              | Dumping data instead of documenting intent           | Replace with story.kv() for the relevant fields only       |
| Comments explaining what a step means     | The step text is unclear                             | Rewrite the step text to be self-explanatory               |

## How to give feedback

Structure your review around three categories:

**Must fix (blocks merge):**

- Scenario tests wrong thing / doesn't match title
- Missing critical path (no error handling, no boundary)
- Business rule is unstated / hidden in implementation

**Should fix (improves quality):**

- Duplication that will cause maintenance pain
- Scenario focus is blurred (testing two rules)
- Step text is implementation-level rather than business-level

**Consider (nice to have):**

- Decision table would make the rule clearer
- Data persona would make the Given more readable
- Mermaid diagram would help visualise the flow

## Example review

```ts
// BEFORE: Review findings
it('test withdrawal', ({ task }) => {
  story.init(task);
  story.given('user has account'); // ❌ Which user? What state?
  story.given('balance is 500'); // ❌ No currency, no persona
  story.given('overdraft is 200'); // ⚠️ Is overdraft relevant to this scenario?
  story.when('user withdraws 100'); // ⚠️ No currency
  story.when('system checks balance'); // ❌ Second When — implementation detail
  story.then('withdrawal succeeds'); // ✓ But vague — what does "succeeds" mean?
  story.then('balance is 400'); // ✓ Concrete outcome
  story.then('receipt is printed'); // ❌ Different output — separate scenario
});

// AFTER: Issues addressed
it('dispenses cash when sufficient funds', ({ task }) => {
  story.init(task);
  story.given('account holder "Sarah" has balance £500');
  story.when('Sarah requests £100 withdrawal');
  story.then('£100 is dispensed');
  story.and('balance is updated to £400');
});
```

## Anti-patterns in reviews

### CRITICAL: Reviewing style instead of substance

Symptom: "Add a semicolon" when the scenario tests the wrong thing. Fix: Focus on what the scenario specifies, not how it's formatted.

### HIGH: Approving without reading the table

Symptom: A decision table has a gap but the reviewer didn't check each row. Fix: Walk each row of every table — gaps are where bugs hide.

### MEDIUM: Suggesting changes without explaining why

Symptom: "Split this scenario" without explaining what rule is being conflated. Fix: Name the specific problem — "this scenario tests both the discount rule and the shipping rule."

## Quick reference

| Principle             | Rule                                                 |
| --------------------- | ---------------------------------------------------- |
| Outcome first         | Can you state the feature's purpose in one sentence? |
| One rule per scenario | Each scenario tests exactly one rule or output       |
| Givens are state      | Givens describe preconditions, not actions           |
| One When              | One logical action per scenario                      |
| Thens are outcomes    | Business outcomes, not implementation details        |
| Tables expose gaps    | Walk every row — empty cells are missing rules       |
| Named data            | Personas over anonymous values                       |
| Contrast matters      | Use But for important non-occurrences                |
