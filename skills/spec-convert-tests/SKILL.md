---
name: spec-convert-tests
description: Use when transforming low-level automated tests into clearer business-facing executable specifications without losing behavioural coverage. Preserves what the tests prove while rewriting how they communicate.
---

# Converting Tests to Executable Stories

Transform existing automated tests into business-readable executable specifications. The goal is not to add a layer on top — it's to replace unclear test code with clear specification code that tests the same behaviour.

## The conversion principle

**Preserve behaviour, rewrite language.** The converted test must fail for the same reasons as the original. It must pass under the same conditions. But it should read like a specification, not like code.

## Agent guardrails

This skill guides what the executable specification should say. It is not an adapter API reference. Treat code examples as specification sketches; if an example uses `story.init(task)`, adapt it before editing non-Vitest adapters.

Framework-native rules and per-adapter init syntax: [AGENT-GUARDRAILS.md](../spec-shared/AGENT-GUARDRAILS.md).

## Step-by-step process

### 1. Read the test and ask: what rule does this prove?

Before touching any code, state in plain English what the test is checking. If you can't, the test might be testing implementation rather than behaviour.

```ts
// Original test
test('applyDiscount returns correct total', () => {
  const cart = new Cart([{ price: 100 }]);
  cart.applyPromo('SAVE20');
  expect(cart.total).toBe(80);
  expect(cart.promos).toHaveLength(1);
});

// What rule does this prove?
// "A 20% promo code reduces the cart total by 20%"
```

### 2. Extract the business intent

| Original element          | Becomes                                         |
| ------------------------- | ----------------------------------------------- |
| Test name                 | Story title — rewrite as behaviour              |
| Setup/arrange code        | `story.given()` — state, not actions            |
| Action/act code           | `story.when()` — the trigger                    |
| Assertions                | `story.then()` / `story.and()` — outcomes       |
| Magic numbers             | Named values with `story.kv()` or data personas |
| Comments explaining "why" | `story.note()`                                  |

### 3. Rewrite

```ts
// Converted
it('applies 20% promotional discount', ({ task }) => {
  story.init(task, { tags: ['pricing', 'promo'] });

  story.given('a cart with one item priced at £100');
  const cart = new Cart([{ price: 100 }]);

  story.when('promo code "SAVE20" is applied');
  cart.applyPromo('SAVE20');

  story.then('the total is reduced to £80');
  expect(cart.total).toBe(80);

  story.and('the promo is recorded on the cart');
  expect(cart.promos).toHaveLength(1);
});
```

### 4. Check nothing was lost

- Same assertions? Yes — `toBe(80)` and `toHaveLength(1)` are preserved.
- Same setup? Yes — same Cart construction and promo application.
- Same failure triggers? Yes — if `applyPromo` breaks, both versions fail.

## What to remove during conversion

| Remove                               | Why                                                                   |
| ------------------------------------ | --------------------------------------------------------------------- |
| Implementation details in test names | "calls calculateDiscount" → "applies staff discount"                  |
| Comments that explain the obvious    | The step text replaces them                                           |
| Console.log / debug output           | Replace with `story.json()` or `story.kv()` if the data matters       |
| Duplicate setup across tests         | Extract to `beforeEach` or a shared helper                            |
| Assertions that test internals       | "spy was called 3 times" — unless the call count IS the specification |

## What to keep

| Keep                        | Why                                                        |
| --------------------------- | ---------------------------------------------------------- |
| Every assertion             | Each one proves something — don't silently drop coverage   |
| Error case tests            | Convert to "declines when..." / "rejects when..." stories  |
| Edge case tests             | These are your most valuable scenarios — name them clearly |
| Performance-sensitive tests | Add `story.kv()` with timing expectations if they matter   |

## Grouping converted tests

Original tests are often flat lists. Converted stories should be grouped by rule or output.

```ts
// BEFORE: Flat list
test('discount 10%', () => { ... });
test('discount 20%', () => { ... });
test('discount invalid code', () => { ... });
test('discount expired code', () => { ... });
test('discount stacking', () => { ... });

// AFTER: Grouped by rule
describe('Promotional discounts', () => {
  describe('Valid promo codes', () => {
    it('applies 10% discount for SAVE10', ...);
    it('applies 20% discount for SAVE20', ...);
  });

  describe('Invalid promo codes', () => {
    it('rejects unrecognised codes', ...);
    it('rejects expired codes', ...);
  });

  describe('Discount stacking', () => {
    it('applies only the highest discount when multiple codes used', ...);
  });
});
```

## Finding missing tests during conversion

Converting tests forces you to state what each test proves. This often reveals gaps:

| Signal during conversion          | What it means                                           |
| --------------------------------- | ------------------------------------------------------- |
| You can't name the rule           | The test might be testing implementation, not behaviour |
| Two tests prove the same rule     | One is redundant, or they test different boundaries     |
| A group has only happy-path tests | Error cases are missing                                 |
| No test for the boundary value    | Add one at, below, and above the threshold              |
| You find a `// TODO` comment      | That's a missing scenario — write it                    |

## Handling test helpers and utilities

Don't convert pure utility tests (e.g., "formatCurrency adds commas"). Only convert tests that specify **user-visible or business-relevant behaviour**.

```ts
// DON'T convert — this is a utility test
test('formatCurrency', () => {
  expect(formatCurrency(1000)).toBe('£1,000.00');
});

// DO convert — this specifies business behaviour
test('receipt shows formatted total', () => {
  const receipt = generateReceipt(order);
  expect(receipt.total).toBe('£1,000.00');
});
```

## Anti-patterns

### CRITICAL: Adding story steps without removing duplication

Symptom: The test now has both story markers AND the original comments and console.logs. Fix: Story steps replace comments and logging — don't layer them.

### HIGH: Weakening assertions during conversion

Symptom: Original tested `toBe(80)`, converted tests only checks `toBeDefined()`. Fix: Keep every original assertion. If anything, add assertions for newly-visible outcomes.

### HIGH: Converting without grouping

Symptom: 40 flat story tests with no describe blocks. Fix: Group by rule or output during conversion, not after.

### MEDIUM: Over-converting

Symptom: Every unit test, including `add(1, 2) === 3`, gets story markers. Fix: Only convert tests that specify business behaviour visible to stakeholders.

## Quick reference

| Principle                   | Rule                                                      |
| --------------------------- | --------------------------------------------------------- |
| Behaviour, not code         | Rewrite names as rules, not function calls                |
| Preserve assertions         | Every original assertion must survive conversion          |
| Group by rule               | Convert the flat list into describe-grouped scenarios     |
| Step text replaces comments | If you need a comment to explain a step, rewrite the step |
| Gaps are discoveries        | If you can't name the rule, the test might be wrong       |
| Don't over-convert          | Utility tests don't need story markers                    |
| Check nothing was lost      | Same setup, same assertions, same failure triggers        |
