---
name: spec-rules-decision-tables
description: Use when specifying business rules, validations, calculations, eligibility, or policy-heavy behaviour. Focuses on decision tables, boundaries, rule combinations, and precedence.
---

# Rule-Focused Specification

Specify behaviour that is governed by policy, calculation, eligibility, validation, pricing, or compliance logic. These domains have one thing in common: the logic is about rules, not journeys.

## When to use this

- Pricing tiers, tax calculations, fee structures
- Eligibility criteria (loans, insurance, access control)
- Validation rules (forms, schemas, business constraints)
- Compliance checks (KYC, age verification, data retention)
- Configuration-driven behaviour (feature flags, plan limits)

If the behaviour changes based on combinations of inputs and conditions rather than a sequence of steps, you're in rule territory.

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

## Decision tables

A decision table makes the rules visible. Each row is a scenario. Each column is a condition or outcome.

```ts
it('shipping fee rules', ({ task }) => {
  story.init(task);

  story.table({
    label: 'Shipping fee calculation',
    columns: ['Order total', 'Member?', 'Weight', 'Region', 'Fee'],
    rows: [
      ['£100+', 'Yes', '<5kg', 'Domestic', '£0 (free)'],
      ['£100+', 'Yes', '5-20kg', 'Domestic', '£3.99'],
      ['£100+', 'No', '<5kg', 'Domestic', '£4.99'],
      ['<£100', 'No', '<5kg', 'Domestic', '£4.99'],
      ['Any', 'Any', 'Any', 'International', '£14.99'],
      ['Any', 'Any', '>20kg', 'Any', 'Manual quote'],
    ],
  });

  // This specific scenario tests the first row
  story.given('member "Sarah" places an order for £120');
  story.and('total weight is 2kg');
  story.and('shipping to domestic address');
  story.when('shipping fee is calculated');
  story.then('fee is £0');
});
```

### Building a decision table

1. **List conditions** (left columns): What inputs affect the outcome?
2. **List outcomes** (right columns): What changes based on those inputs?
3. **Fill rows**: Start with the obvious cases, then vary one condition at a time.
4. **Find gaps**: Any combination of conditions not covered? That's a missing rule.
5. **Find contradictions**: Two rows match the same inputs but give different outcomes? That's a precedence problem.

## Boundaries

Rules often have thresholds. Test on, just below, and just above each boundary.

```ts
describe('Age verification', () => {
  it('admits at exactly 18', ({ task }) => {
    story.init(task);
    story.given('applicant is exactly 18 years old');
    story.when('age is verified');
    story.then('applicant is admitted');
  });

  it('rejects at 17 years 364 days', ({ task }) => {
    story.init(task);
    story.given('applicant is 17 years and 364 days old');
    story.when('age is verified');
    story.then('applicant is rejected');
  });
});
```

**Boundary checklist for each threshold:**

| Position | What to test                |
| -------- | --------------------------- |
| Below    | One unit below the boundary |
| At       | Exactly at the boundary     |
| Above    | One unit above the boundary |
| Zero     | The empty/zero case         |
| Maximum  | The largest valid value     |
| Overflow | One beyond maximum          |

## Rule combinations

When multiple rules apply at once, specify what wins.

### Precedence

```ts
describe('Discount precedence', () => {
  it('staff discount overrides promotional discount', ({ task }) => {
    story.init(task);

    story.table({
      label: 'Discount precedence',
      columns: ['Staff?', 'Promo code?', 'Loyalty tier', 'Applied discount'],
      rows: [
        ['Yes', 'Yes', 'Gold', '30% (staff)'],
        ['Yes', 'No', 'Silver', '30% (staff)'],
        ['No', 'Yes', 'Gold', '20% (promo, highest wins)'],
        ['No', 'Yes', 'None', '15% (promo)'],
        ['No', 'No', 'Gold', '10% (loyalty)'],
        ['No', 'No', 'None', '0%'],
      ],
    });

    story.given('staff member "Alex" shops during a 15% promo');
    story.and('Alex has Gold loyalty status');
    story.when('discount is calculated');
    story.then('30% staff discount is applied');
    story.note(
      'Staff discount takes absolute precedence. Promo and loyalty are compared; highest wins.',
    );
  });
});
```

### Additive vs exclusive rules

State explicitly whether rules stack or compete:

- **Additive:** "Free shipping AND 10% discount both apply"
- **Exclusive:** "Staff discount OR promo code, whichever is higher"
- **Conditional:** "Promo code applies only if no staff discount"

## Validation rules

For input validation, specify what happens on each kind of invalid input, not just "it fails."

```ts
describe('Email validation', () => {
  it('accepts valid formats', ({ task }) => {
    story.init(task);
    story.table({
      label: 'Valid email examples',
      columns: ['Input', 'Accepted?', 'Reason'],
      rows: [
        ['user@example.com', 'Yes', 'Standard format'],
        ['user+tag@example.com', 'Yes', 'Plus addressing'],
        ['user@sub.example.com', 'Yes', 'Subdomain'],
      ],
    });
  });

  it('rejects invalid formats with specific errors', ({ task }) => {
    story.init(task);
    story.table({
      label: 'Invalid email examples',
      columns: ['Input', 'Accepted?', 'Error message'],
      rows: [
        ['', 'No', 'Email is required'],
        ['user', 'No', 'Email must contain @'],
        ['user@', 'No', 'Email must have a domain'],
        ['@example.com', 'No', 'Email must have a local part'],
        ['user @example.com', 'No', 'Email must not contain spaces'],
      ],
    });
  });
});
```

## Anti-patterns

### CRITICAL: Hiding rules inside step text

Symptom: The rule is only visible by reading 15 Given steps across 8 scenarios. Fix: State the rule in a decision table, then write scenarios that test specific rows.

### HIGH: Testing combinations without a table

Symptom: Combinatorial explosion of scenarios with no visible structure. Fix: Build the decision table first. You'll find that many combinations collapse into a few rules.

### HIGH: Missing boundary tests

Symptom: Tests at £50 and £150 but not at the £100 threshold. Fix: Use the boundary checklist for every threshold in every rule.

### MEDIUM: Unstated precedence

Symptom: Two rules could both match, but the spec doesn't say which wins. Fix: Add a precedence column or a separate precedence table.

## Quick reference

| Principle                | Rule                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| Table before scenarios   | Build the decision table, then write scenarios for specific rows   |
| Boundaries are scenarios | Every threshold gets at-below-above tests                          |
| State precedence         | When rules overlap, say which wins and why                         |
| Additive or exclusive    | Say whether rules stack or compete                                 |
| Validate with errors     | Each invalid input gets its own error message, not just "rejected" |
| Gaps are rules           | An empty cell in your table is a missing rule                      |
