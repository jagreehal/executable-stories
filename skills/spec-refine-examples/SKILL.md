---
name: spec-refine-examples
description: Use when you have raw examples, acceptance criteria, or conversation notes and need to refine them into concise, business-readable executable specifications. Based on Gojko Adzic's Specification by Example.
---

# Refine Examples into Specifications

Raw examples are not a specification. Teams fail when they dump examples straight into tests without extracting the real rules, removing noise, and making the examples business-readable.

**Core principle:** Good examples clarify behaviour. Bad examples document implementation.

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

## When to use this

- After an Example Mapping session that produced rules and examples
- When acceptance criteria exist but scenarios don't
- When a ticket has a wall of text describing what "should work"
- When existing scenarios feel noisy, repetitive, or implementation-heavy

## The refinement process

```
Raw examples → Extract rules → Collapse duplicates → Find the minimal set → Rewrite in domain language → Specification
```

### 1. Remove irrelevant detail

Raw examples contain setup noise that isn't part of the rule being tested. Strip it.

```ts
// RAW: From the conversation
// "When Sarah logs in at 3pm on Tuesday from her laptop running Chrome
//  with her premium account and two-factor auth enabled, she should
//  see her personalised dashboard"

// ❌ Specification that preserves all the noise
it('shows dashboard', ({ task }) => {
  story.init(task);
  story.given('Sarah logs in at 3pm on Tuesday');
  story.and('she is using Chrome on a laptop');
  story.and('she has a premium account');
  story.and('two-factor auth is enabled');
  story.when('login completes');
  story.then('she sees her personalised dashboard');
});

// ✅ Specification that keeps only what matters
it('shows personalised dashboard for premium members', ({ task }) => {
  story.init(task);
  story.given('premium member "Sarah" is authenticated');
  story.when('Sarah views the dashboard');
  story.then('the dashboard is personalised to Sarah');
});
```

**The test:** Remove a Given. Does the scenario still make sense? If yes, that Given was noise.

### 2. Extract the business rule from each example

Every example illustrates a rule. If you can't name the rule, the example is unclear.

```
Examples from conversation:
- "Sarah with £500 balance gets her £100"
- "Tom with £0 balance gets declined"
- "Tom with £50 balance and £200 overdraft gets his £100"
- "Sarah requesting £10,000 gets declined even with £50,000 balance"

Extracted rules:
1. Withdrawal succeeds when balance covers the amount
2. Withdrawal succeeds when balance + overdraft covers the amount
3. Withdrawal fails when amount exceeds balance + overdraft
4. Daily withdrawal limit applies regardless of balance  ← new rule!
```

The fourth example didn't fit rules 1-3. That forced a new rule to emerge. This is refinement working.

### 3. Collapse duplicate examples

Two examples that illustrate the same rule in the same way are duplicates. Keep the clearest one.

```
Before (4 examples, same rule):
- "Sarah with £500 withdraws £100 → succeeds"
- "Tom with £1000 withdraws £50 → succeeds"
- "Alice with £200 withdraws £199 → succeeds"
- "Bob with £5000 withdraws £1 → succeeds"

After (2 examples, same rule):
- "Sarah with £500 withdraws £100 → succeeds" (standard case)
- "Alice with £200 withdraws £200 → succeeds" (boundary: exact balance)
```

The collapsed set proves the same rule with less noise. Keep examples that test **different aspects** of the same rule — a typical case and a boundary.

### 4. Find the minimal example set

For each rule, you need:

- One example that **confirms** the rule (it works as stated)
- One example that **challenges** the rule (boundary, edge, exception)
- Optionally one that shows the rule **interacting** with another rule

More than 4 examples per rule means either the rule is too broad (split it) or examples are duplicates (collapse them).

### 5. Separate "example of the rule" from "technical setup"

The specification should express what the system should do. The test code handles how.

```ts
// ❌ Technical setup leaking into the specification
it('applies discount', ({ task }) => {
  story.init(task);
  story.given('database contains user with id=42 and tier="gold"');
  story.and('promo table has row code="SAVE20" active=true expires=null');
  story.when('POST /api/cart/discount with body {"code":"SAVE20","userId":42}');
  story.then('response status is 200');
  story.and('response body contains {"discount":0.20}');
});

// ✅ Business rule expressed in domain language
it('applies promotional discount for eligible members', ({ task }) => {
  story.init(task);
  story.given('Gold member "Sarah" has items in her cart');
  story.and('promotional code "SAVE20" is active');
  story.when('Sarah applies the promo code');
  story.then('20% discount is applied to the cart total');
});
```

The test code behind both scenarios might be identical. The difference is that the second one is a specification a product owner can read and validate.

### 6. Rewrite in domain language

Use the words the business uses. If you're translating between business language and code language, the specification is in the wrong language.

| Implementation language | Domain language     |
| ----------------------- | ------------------- |
| "User with role=admin"  | "Administrator"     |
| "Record with status=2"  | "Approved claim"    |
| "Timestamp < now()"     | "Offer has expired" |
| "Array.length > 0"      | "Cart has items"    |
| "HTTP 403"              | "Access is denied"  |

## The refinement checklist

Before calling a specification done, check each scenario:

| Check                                                      | Pass                                          | Fail                                  |
| ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Can you name the rule this example illustrates?            | "Withdrawal succeeds when balance sufficient" | "It tests the withdrawal thing"       |
| Is every Given necessary for this specific rule?           | Remove one and the scenario breaks            | Remove one and nothing changes        |
| Is the When about a business action, not a technical call? | "Sarah requests withdrawal"                   | "POST /api/withdraw"                  |
| Is the Then about a business outcome, not a response code? | "Withdrawal is declined"                      | "Status 422 returned"                 |
| Would a business person validate this as correct?          | They can read it and say "yes" or "no"        | They need a developer to explain it   |
| Is this example distinct from others under the same rule?  | Tests a different aspect or boundary          | Same rule, slightly different numbers |

## Anti-patterns

### CRITICAL: Automating raw examples without refinement

Symptom: 30 scenarios that read like meeting notes. Fix: Extract rules first, then collapse examples to the minimal set that proves each rule.

### HIGH: Rewriting the specification during automation

Symptom: The scenario in the test doesn't match what the business agreed to. Fix: Automate the specification as-is. If the wording needs to change to make automation work, the specification is too implementation-coupled.

### HIGH: One scenario, many rules

Symptom: A scenario with 6 Givens and 4 Thens. Fix: Each rule gets its own scenario. Shared setup goes in a `beforeEach` or data persona.

### MEDIUM: Domain language drift

Symptom: The team says "order" but the spec says "purchase request." Fix: Use the team's actual vocabulary. Update the spec when the vocabulary evolves.

## Quick reference

| Principle                       | Rule                                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| Examples are raw material       | They need refinement before they become specifications                  |
| Name the rule                   | Every example must illustrate a named business rule                     |
| Remove noise                    | If removing a Given doesn't break the scenario, it's noise              |
| Collapse duplicates             | Two examples proving the same thing in the same way — keep the clearest |
| Minimal set                     | 2-4 examples per rule: confirm, challenge, interact                     |
| Domain language                 | Use the words the business uses, not the code's vocabulary              |
| Don't rewrite during automation | If wording changes for automation, the spec is too technical            |
