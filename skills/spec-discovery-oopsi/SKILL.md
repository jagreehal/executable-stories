---
name: spec-discovery-oopsi
description: Use when writing new executable story tests, converting existing tests to stories, or reviewing story test quality. Guides specification shape using OOPSI decomposition before writing Given/When/Then.
---

# BDD Discovery & OOPSI Writing Guide

Write better executable specifications by thinking about the shape of the specification before diving into Given/When/Then syntax.

**Core principle:** Start with the value (Outcome), defer detail on unimportant things until later. If you jump into GWT too early, you end up with unfocused scenarios, duplicated preconditions, and missed edge cases.

## Agent guardrails

This skill guides what the executable specification should say. It is not an adapter API reference. Treat code examples as specification sketches; if an example uses `story.init(task)`, adapt it before editing non-Vitest adapters.

Framework-native rules and per-adapter init syntax: [AGENT-GUARDRAILS.md](../spec-shared/AGENT-GUARDRAILS.md).

## The OOPSI Model

OOPSI (Outcomes → Outputs → Process → Scenarios → Inputs) is an extension of Chris Matt's Feature Injection, created by Jag Reehal and Pete Buckney. It structures how you think about what to specify.

| Level         | Question                                                                  | Maps to                                                            |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Outcomes**  | What value are we delivering? Why does this matter?                       | Story title, `describe` block name                                 |
| **Outputs**   | What tangible things does the user get? (Data, screens, messages, errors) | Doc entries: `story.json()`, `story.table()`, `story.screenshot()` |
| **Process**   | What interactions/steps produce those outputs?                            | `story.when()` steps, `story.mermaid()` for flow                   |
| **Scenarios** | What paths through the process exist? What rules apply?                   | Individual `it()` test cases                                       |
| **Inputs**    | What preconditions and data drive each scenario?                          | `story.given()` steps, `story.table()` for examples                |

**Mental checklist before writing any story test:**

1. What **outcome** does this feature serve?
2. What **outputs** can be produced? (List them all — cash, receipts, errors, updated state)
3. What **process** generates the most important output?
4. What **scenarios** are paths through that process or rules that apply?
5. What **inputs** and preconditions make each scenario different?

## Writing Guidelines

### Don't dive into GWT too early

```ts
// ❌ BAD: Jumped straight into steps without thinking about specification shape
it('withdraws cash', ({ task }) => {
  story.init(task);
  story.given('user has account with balance £500');
  story.given('user inserts valid card');
  story.given('user enters correct PIN');
  story.given('user has overdraft facility of £200');
  story.when('user requests £100');
  story.then('£100 is dispensed');
  story.then('balance is £400');
  story.then('receipt is printed');
  story.then('card is returned');
});
```

The problem: one scenario trying to cover everything — multiple outputs, preconditions jumbled together, no structure.

### Think outputs first, then organise scenarios around them

```ts
// ✅ GOOD: Scenarios organised around the most important output (cash)
describe('ATM Cash Withdrawal', () => {
  // Outcome documented at suite level
  it('dispenses cash when sufficient funds', ({ task }) => {
    story.init(task);
    story.given('account holder "Sarah" has balance £500');
    story.when('Sarah requests £100');
    story.then('£100 is dispensed');
    story.and('balance is updated to £400');
  });

  it('dispenses cash using overdraft when balance insufficient', ({ task }) => {
    story.init(task);
    story.given('account holder "Sarah" has balance £50');
    story.and('overdraft facility is £200');
    story.when('Sarah requests £100');
    story.then('£100 is dispensed');
    story.and('balance is updated to -£50');
  });

  it('declines when exceeds balance and overdraft', ({ task }) => {
    story.init(task);
    story.given('account holder "Sarah" has balance £50');
    story.and('overdraft facility is £200');
    story.when('Sarah requests £300');
    story.then('withdrawal is declined');
    story.and('error message explains insufficient funds');
  });
});
```

### Use tables for "what", steps for "how"

Tables help you spot gaps and find new scenarios. They focus on the data, not the mechanics.

```ts
// Use story.table() to illustrate the specification by example
it('cash withdrawal rules', ({ task }) => {
  story.init(task);

  story.table({
    label: 'Withdrawal examples',
    columns: ['Balance', 'Overdraft', 'Request', 'Outcome', 'New Balance'],
    rows: [
      ['£500', '£0', '£100', 'Dispensed', '£400'],
      ['£50', '£200', '£100', 'Dispensed', '-£50'],
      ['£50', '£200', '£300', 'Declined', '£50'],
      ['£0', '£0', '£50', 'Declined', '£0'],
    ],
  });

  // Steps test the specific scenario
  story.given('account holder "Sarah" has balance £500');
  story.when('Sarah requests £100');
  story.then('£100 is dispensed');
});
```

When a new column appears in your table, you've probably found a new rule — and a new scenario.

## Data Personas

Give test data profiles a name and personality. Reuse them across stories.

```ts
// ❌ BAD: Anonymous, hard to discuss
story.given('user has balance £500 and overdraft £200');

// ✅ GOOD: Named persona, easy to reference in conversations
story.given('account holder "Sarah" has a standard current account');
story.note('Sarah: balance £500, overdraft £200, no fraud flags');
```

Data personas become ubiquitous examples — the team says "what happens when Sarah tries this?" rather than "what happens when a user with £500 balance and £200 overdraft...".

## Finding Dragons

Dragons are hidden rules lurking in the preconditions. Explore the **context** (the Givens) to find them.

**Context questioning technique:** For each output, ask "Is there any scenario where this wouldn't happen?" The answer reveals new preconditions.

- "Is there any scenario where you wouldn't get your card back?" → "Yes, when there's a fraud flag" → new precondition discovered
- "Is there any scenario where cash wouldn't be dispensed even with sufficient funds?" → "Yes, ATM cash limit, daily withdrawal limit" → more dragons

**When a new column appears in your example table, you've found a dragon.** If adding "fraud flag" to your table introduces new permutations across existing scenarios, it's probably a separate rule that deserves its own scenario group.

## Anti-Patterns

### **CRITICAL:** Masses of duplication from skipping analysis

Symptom: 20 scenarios with overlapping preconditions, each testing a slightly different combination. Fix: Use OOPSI to identify the shared processes and outputs, then use example tables to rationalise.

### **HIGH:** Emphasis on steps over value

Symptom: Scenarios describe mechanical steps ("user clicks button", "system validates input") rather than business outcomes ("withdrawal is declined", "receipt shows updated balance"). Fix: Start with Outcomes and Outputs, not Process.

### **HIGH:** One scenario testing everything

Symptom: A single test with 8+ given/when/then steps covering multiple outputs. Fix: Split by output — each scenario should focus on one key output or rule.

### **MEDIUM:** No context exploration

Symptom: Happy path only, edge cases discovered in production. Fix: Use context questioning at the Inputs level — "Is there any scenario where X wouldn't happen?"

## Quick Reference

| Principle               | Rule                                                                              |
| ----------------------- | --------------------------------------------------------------------------------- |
| Start with value        | Name your `describe` after the outcome, not the feature                           |
| One output per scenario | Each `it()` focuses on one key output or rule                                     |
| Tables before steps     | Use `story.table()` to explore examples, then write steps for the specific case   |
| Named data              | Use data personas with `story.note()` — give test data a name and personality     |
| Find dragons            | Ask "Is there any scenario where X wouldn't happen?" for each output              |
| New column = new rule   | If your example table needs a new column, you've found a new scenario group       |
| Group by output         | Organise `describe` blocks around outputs and processes, not arbitrary categories |
| Defer detail            | Don't explore low-value outputs until you've covered high-value ones              |
