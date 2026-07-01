---
name: spec-outside-in-behaviour
description: Use when discovering behaviour from user goals and driving system design from the outside in using scenarios. Based on Dan North's view that BDD is collaborative discovery, not test scripting.
---

# Outside-In Behaviour Specification

BDD is not "test scripts in Given/When/Then form." It is collaborative, behaviour-focused discovery. Regression tests are a by-product. The real activity is discovering shared understanding by describing what the system **should** do.

**Core principle:** Start with the behaviour the stakeholder cares about. Let the design emerge from the scenarios, not the other way around.

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

## The outside-in sequence

```
Stakeholder goal
  → Desired behaviour ("what should happen")
    → Outermost scenario
      → Discover what collaborators are needed
        → Behavioural specs for those collaborators
          → Design emerges
```

You do not design the system and then write scenarios to test it. You write scenarios that describe what the system should do, and the design falls out of that.

## Start from the outside

The first scenario should describe what a stakeholder would observe. No internals, no services, no databases.

```ts
// ❌ Inside-out: starts with the implementation
describe('PaymentService', () => {
  it('calls Stripe API with correct parameters', ({ task }) => {
    story.init(task);
    story.given('a PaymentService instance with test API key');
    story.when('processPayment is called with amount 5000 and currency GBP');
    story.then(
      'Stripe.charges.create is called with {amount: 5000, currency: "gbp"}',
    );
  });
});

// ✅ Outside-in: starts with the stakeholder's world
describe('Checkout payment', () => {
  it('should complete payment for a valid order', ({ task }) => {
    story.init(task);
    story.given('customer "Sarah" has a cart totalling £50');
    story.and('Sarah has a valid payment method on file');
    story.when('Sarah completes checkout');
    story.then('payment of £50 is taken');
    story.and('Sarah receives an order confirmation');
  });
});
```

The second scenario tells you **what the system should do** without prescribing how. The PaymentService, the Stripe API, the database — those emerge when you ask "what do we need to make this behaviour work?"

## Use "should" to frame behaviour

Dan North uses "should" deliberately. It frames the conversation around responsibility and expected behaviour, not implementation certainty.

```ts
// "Should" invites discussion: "Should it really? Always? Under what conditions?"
it('should decline the payment when the card has expired');
it('should notify the warehouse when payment succeeds');
it('should refund automatically if delivery fails within 24 hours');

// Contrast with mechanical language that shuts down discussion:
it('returns 402 when card.expiry < Date.now()'); // No room for "should it?"
it('publishes OrderPaid event to warehouse queue'); // Implementation, not behaviour
```

"Should" also makes it easy to challenge: "Should it decline immediately, or should it prompt for an alternative card?" That question discovers behaviour. "Returns 402" does not.

## Discover collaborators from scenarios

Each scenario reveals what the system needs. Don't pre-design — let the scenarios tell you.

```ts
// Scenario: "should complete payment for a valid order"
// This tells us we need:
//   - Something that knows cart totals       → Cart / pricing service
//   - Something that takes payment           → Payment gateway
//   - Something that sends confirmation      → Notification service
//   - Something that records the order       → Order store

// Now write behavioural specs for each collaborator:
describe('Payment gateway', () => {
  it('should take payment when card is valid and has sufficient funds', ...);
  it('should decline when card has expired', ...);
  it('should decline when funds are insufficient', ...);
});

describe('Order confirmation', () => {
  it('should send email with order details after successful payment', ...);
  it('should not send confirmation if payment fails', ...);
});
```

Each collaborator gets its own behavioural spec. The design of services, APIs, and data models emerges from these specs — not before them.

## Progressive discovery

Work from the outermost scenario inward, one layer at a time.

```
Layer 1: User-facing behaviour
  "Sarah completes checkout → payment taken, confirmation sent"

Layer 2: Service behaviour (discovered from Layer 1)
  "Payment gateway takes payment when card valid"
  "Notification service sends confirmation after payment"

Layer 3: Component behaviour (discovered from Layer 2)
  "Card validator checks expiry and CVV"
  "Email template renders order details"
```

Each layer is a behavioural spec, not a unit test. The question is always "what should this thing do?" — not "how does it work internally?"

## Writing for stakeholder recognition

Every scenario should pass the "would a stakeholder recognise this as their problem?" test.

```ts
// ❌ Stakeholder cannot recognise this
it('validates input and returns domain error', ({ task }) => {
  story.init(task);
  story.given('request body with missing required field "email"');
  story.when('validation middleware processes the request');
  story.then('ValidationError is thrown with code MISSING_FIELD');
});

// ✅ Stakeholder recognises this immediately
it('should reject registration when email is missing', ({ task }) => {
  story.init(task);
  story.given('a new user filling in the registration form');
  story.when('they submit without entering an email address');
  story.then('registration is rejected');
  story.and('they see "Email address is required"');
});
```

Both scenarios test the same code path. The second one describes behaviour a product owner would discuss in a planning meeting.

## Behaviour vs implementation

| Implementation detail             | Behaviour                  |
| --------------------------------- | -------------------------- |
| Calls `stripe.charges.create`     | Takes payment              |
| Publishes event to SQS queue      | Notifies the warehouse     |
| Inserts row into `orders` table   | Records the order          |
| Returns HTTP 201                  | Registration succeeds      |
| Throws `InsufficientFundsError`   | Declines the payment       |
| Sets `user.email_verified = true` | Confirms the email address |

If the scenario would break when you change the implementation without changing the behaviour, it's too coupled. Refactoring should not break specifications.

## Scenarios as design conversations

Use scenarios to discover design decisions, not to document decisions already made.

**Before writing code, write the scenario and ask:**

- "What should happen when...?" → reveals the required behaviour
- "Who cares about this outcome?" → reveals the stakeholder
- "What else should happen?" → reveals side effects and collaborators
- "What should NOT happen?" → reveals constraints (use `but()`)
- "When should this NOT happen?" → reveals preconditions and guards

```ts
it('should not send marketing emails to users who opted out', ({ task }) => {
  story.init(task);
  story.given('customer "Tom" has opted out of marketing');
  story.when('a promotional campaign is triggered');
  story.then('Tom does not receive the campaign email');
  story.but('Tom still receives transactional emails');
  story.note('Discovered: need to distinguish marketing from transactional');
});
```

The `story.note()` records a design discovery. The scenario didn't just test behaviour — it revealed a distinction the team hadn't discussed.

## Anti-patterns

### CRITICAL: Designing first, specifying second

Symptom: The architecture diagram exists before any scenarios are written. Scenarios are fitted to the design. Fix: Write the outermost scenario first. Let the design emerge from what the system should do.

### CRITICAL: Treating BDD as "writing test scripts"

Symptom: Developers write scenarios alone, after implementation. Fix: Scenarios are a collaboration tool. Write them with stakeholders, before code, to discover shared understanding.

### HIGH: Internals in the outermost scenario

Symptom: The user-facing scenario mentions databases, queues, or API endpoints. Fix: Push those details to inner-layer specs. The outer layer uses only domain language.

### HIGH: No "should" — no room for discussion

Symptom: Scenarios state facts ("user is redirected") instead of intentions ("user should see their dashboard"). Fix: Frame every scenario as "should" — it invites challenge and refinement.

### MEDIUM: Flat scenarios with no layering

Symptom: All scenarios are at the same level of detail. Mix of user-facing and component-level specs in one file. Fix: Separate layers. User-facing specs in one place, service specs in another, component specs in a third.

## Quick reference

| Principle                     | Rule                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| Outside in                    | Start with stakeholder-visible behaviour, discover internals from there |
| "Should" language             | Frame behaviour as "should" to invite challenge and discussion          |
| Scenarios discover design     | Don't design then test — specify then discover                          |
| Stakeholder recognition       | Would a non-developer recognise this as their problem?                  |
| Behaviour over implementation | If refactoring breaks the spec, the spec is too coupled                 |
| Progressive layers            | Outer (user) → middle (service) → inner (component)                     |
| Collaboration first           | Write scenarios with stakeholders, not for them                         |
