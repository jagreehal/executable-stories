---
name: spec-workflow-state
description: Use when specifying multi-step workflows, approvals, handoffs, state transitions, or long-running business processes. Covers happy paths, alternate paths, interruptions, and ownership.
---

# Workflow & Process Specification

Specify behaviour that unfolds over time — multi-step journeys, approval chains, handoffs between actors, retries, and state transitions. If the interesting behaviour is "what happens next" and "what if it doesn't," you're in workflow territory.

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
- Rust: use `Story::new("Scenario")`; call `s.pass()` for passing tests and `collector::write_results()` for output.
- xUnit: use `Story.Init("Scenario", ...)`; call `Story.RecordAndClear()` at the end of each test.

## When to use this

- Checkout flows, onboarding journeys, multi-page forms
- Approval chains (manager → finance → legal)
- Order lifecycle (placed → paid → shipped → delivered → returned)
- Retry and recovery (payment retry, email resend, job requeue)
- Async handoffs (user submits → system processes → user notified)

## Start with the happy path

Map the simplest successful path through the workflow before exploring alternatives.

```ts
describe('Order fulfilment', () => {
  it('happy path: order placed to delivered', ({ task }) => {
    story.init(task);

    story.mermaid({
      title: 'Order lifecycle',
      code: `stateDiagram-v2
        [*] --> Placed
        Placed --> Paid: payment confirmed
        Paid --> Picking: warehouse notified
        Picking --> Shipped: carrier collected
        Shipped --> Delivered: delivery confirmed
        Delivered --> [*]`,
    });

    story.given('customer "Sarah" places order #1234');
    story.when('payment is confirmed');
    story.then('order status is "Paid"');
    story.and('warehouse receives picking instruction');
  });
});
```

## Alternate paths

Once the happy path is clear, explore branches. Each branch is a separate scenario.

```ts
describe('Order fulfilment — alternate paths', () => {
  it('payment fails and order is held', ({ task }) => {
    story.init(task);
    story.given('customer "Sarah" places order #1234');
    story.when('payment is declined');
    story.then('order status is "Payment failed"');
    story.and('customer receives retry prompt');
    story.but('warehouse is not notified');
  });

  it('delivery fails and triggers redelivery', ({ task }) => {
    story.init(task);
    story.given('order #1234 is shipped');
    story.when('delivery attempt fails — nobody home');
    story.then('order status is "Delivery failed"');
    story.and('redelivery is scheduled for next working day');
  });
});
```

## State transitions

For lifecycle-heavy behaviour, specify the allowed and forbidden transitions.

### Allowed transitions table

```ts
it('order state transitions', ({ task }) => {
  story.init(task);

  story.table({
    label: 'Allowed transitions',
    columns: ['From', 'Event', 'To', 'Who triggers'],
    rows: [
      ['Placed', 'Payment confirmed', 'Paid', 'Payment gateway'],
      ['Placed', 'Payment declined', 'Payment failed', 'Payment gateway'],
      ['Payment failed', 'Retry succeeds', 'Paid', 'Customer'],
      ['Payment failed', 'Cancelled by customer', 'Cancelled', 'Customer'],
      ['Paid', 'Warehouse picks', 'Picking', 'Warehouse'],
      ['Picking', 'Carrier collected', 'Shipped', 'Warehouse'],
      ['Shipped', 'Delivery confirmed', 'Delivered', 'Carrier'],
      ['Shipped', 'Delivery failed', 'Delivery failed', 'Carrier'],
      ['Delivery failed', 'Redelivery succeeds', 'Delivered', 'Carrier'],
      ['Delivered', 'Return requested', 'Return pending', 'Customer'],
    ],
  });
});
```

### Forbidden transitions

These are as important as allowed ones. They prevent illegal state changes.

```ts
it('forbidden transitions', ({ task }) => {
  story.init(task);

  story.table({
    label: 'Forbidden transitions',
    columns: ['From', 'Attempted event', 'Why forbidden'],
    rows: [
      ['Cancelled', 'Payment confirmed', 'Cancelled orders cannot be revived'],
      ['Delivered', 'Payment declined', 'Already fulfilled — refund instead'],
      ['Placed', 'Delivery confirmed', 'Must go through payment and shipping'],
      ['Shipped', 'Cancelled', 'Cannot cancel after carrier collection'],
    ],
  });

  story.given('order #1234 is in "Cancelled" state');
  story.when('payment confirmation arrives');
  story.then('transition is rejected');
  story.and('error logged: "Cannot transition cancelled order to paid"');
});
```

## Interruptions and recovery

Workflows get interrupted. Specify what happens when they do.

| Interruption                | Questions to ask                                                           |
| --------------------------- | -------------------------------------------------------------------------- |
| **Timeout**                 | How long before it's stale? What state does it move to? Who gets notified? |
| **Manual override**         | Who can force a transition? What audit trail is left?                      |
| **Partial completion**      | Which steps are reversible? What cleanup happens?                          |
| **Duplicate event**         | Is the transition idempotent? What happens on replay?                      |
| **Concurrent modification** | Two actors change state simultaneously — who wins?                         |

```ts
describe('Payment retry timeout', () => {
  it('auto-cancels after 72 hours without payment', ({ task }) => {
    story.init(task);
    story.given('order #1234 is in "Payment failed" state');
    story.and('72 hours have passed since last retry');
    story.when('timeout check runs');
    story.then('order status is "Auto-cancelled"');
    story.and('customer receives cancellation email');
    story.and('reserved stock is released back to inventory');
    story.but('warehouse is not asked to pick the order');
  });
});
```

## Multi-actor handoffs

When ownership changes, specify who does what and what they can see.

```ts
it('approval handoff from manager to finance', ({ task }) => {
  story.init(task);

  story.table({
    label: 'Actor responsibilities',
    columns: ['Step', 'Actor', 'Action', 'Sees'],
    rows: [
      ['1', 'Employee', 'Submits expense claim', 'Claim form'],
      ['2', 'Manager', 'Reviews and approves', 'Claim + receipts + budget'],
      ['3', 'Finance', 'Processes payment', 'Approved claim + cost centre'],
      ['4', 'Employee', 'Receives payment', 'Payment confirmation'],
    ],
  });

  story.given('employee "Tom" submits expense claim for £450');
  story.when('manager "Lisa" approves the claim');
  story.then('claim is routed to Finance');
  story.and('Finance sees the approved amount and cost centre');
  story.but('Finance does not see the receipts');
});
```

## Async and eventual consistency

When steps don't happen immediately, specify the intermediate states.

```ts
it('payment processing is async', ({ task }) => {
  story.init(task);
  story.given('customer submits payment');
  story.when('payment gateway begins processing');
  story.then('order status is "Payment pending"');
  story.and('customer sees "Processing your payment..."');
  story.note(
    'Payment confirmation arrives via webhook, typically 2-30 seconds later',
  );
});
```

## Anti-patterns

### CRITICAL: Specifying only the happy path

Symptom: The workflow spec has one path. Production has twelve failure modes. Fix: For every step, ask "what if this fails?" and "what if this never happens?"

### HIGH: State transitions without ownership

Symptom: "Order moves to shipped" — but who triggers it? Fix: Every transition needs a trigger and an actor.

### HIGH: No timeout specification

Symptom: A workflow step waits forever. Fix: Every async step needs a timeout, a timeout action, and a notification.

### MEDIUM: Mixing journey and rules

Symptom: State transition logic tangled with business rule logic. Fix: Specify the state machine separately from the rules that govern each transition. Use spec-rules-decision-tables for the rule logic.

## Quick reference

| Principle               | Rule                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Happy path first        | Map the simplest success path before exploring branches    |
| One branch per scenario | Each alternate path gets its own `it()`                    |
| Allowed and forbidden   | Specify both what can happen and what must not             |
| Every step has an owner | State transitions need an actor and a trigger              |
| Timeouts are scenarios  | Every async step needs a timeout specification             |
| Interruptions are real  | Ask "what if this fails/stalls/duplicates?" for every step |
| Diagram the machine     | Use `story.mermaid()` to make the state model visible      |
