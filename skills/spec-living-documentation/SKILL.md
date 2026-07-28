---
name: spec-living-documentation
description: Use when writing executable specifications that should remain readable and useful long after implementation as a trusted source of truth. Focused on longevity, organisation, and readability for mixed audiences.
---

# Living Documentation

Executable specifications are not disposable test scripts. When written and maintained well, they become a trusted source of truth: documentation that stays close to real behaviour because it is exercised by running code.

**Core principle:** If the specification would not make sense six months from now to someone who was not in the original conversation, it has failed as living documentation.

## Agent guardrails

This skill guides what the executable specification should say. It is not an adapter API reference. Treat code examples as specification sketches; if an example uses `story.init(task)`, adapt it before editing non-Vitest adapters.

Framework-native rules and per-adapter init syntax: [AGENT-GUARDRAILS.md](../spec-shared/AGENT-GUARDRAILS.md).

## The test for living documentation

Ask three questions about every specification:

1. **Would a new team member understand the business rule by reading this?**
2. **Would a product owner confirm this is still correct without developer help?**
3. **Would you trust this over a wiki page or a Confluence doc?**

If any answer is no, improve the specification before treating it as durable documentation.

## Organise by business capability

Group specifications by what the business does, not by how the code is structured.

```text
// Organised by code structure — hard to navigate by business concept
tests/
  services/
    payment-service.test.ts
    user-service.test.ts
    notification-service.test.ts

// Organised by business capability — mirrors the domain
stories/
  checkout/
    pricing.story.test.ts
    payment.story.test.ts
    order-confirmation.story.test.ts
  membership/
    registration.story.test.ts
    tier-upgrade.story.test.ts
  returns/
    return-request.story.test.ts
    refund-processing.story.test.ts
```

When the business says "how does checkout work?", you open one folder. When they say "what are the refund rules?", you open another. The structure mirrors the domain, not the architecture.

## Write for two audiences

Every specification has two readers: the developer who maintains it and the stakeholder who validates it.

```ts
// Only developers can read this
it('applies tiered discount with ceiling', ({ task }) => {
  story.init(task);
  story.given('cart.items.reduce((s,i) => s+i.price, 0) > TIER_2_THRESHOLD');
  story.when('calculateDiscount(cart, promos) is invoked');
  story.then('discount <= MAX_DISCOUNT_CAP');
});

// Both audiences can read this
it('caps the discount at 30% even when multiple promotions apply', ({
  task,
}) => {
  story.init(task);
  story.given('customer "Sarah" has items totalling £200');
  story.and('two active promotions: "SAVE15" and "LOYALTY10"');
  story.when('discounts are calculated');
  story.then('combined discount is capped at 30%');
  story.and('Sarah pays £140');

  story.note(
    'Business rule: Maximum combined discount is 30%, regardless of promotion stacking.',
  );
});
```

A short note can make the governing rule explicit for future readers. Six months from now, when someone asks "why is the cap 30%?", the answer is in the specification.

## Make important rules visible

Don't let rules exist only inside assertions. Make them visible in the generated documentation output, not just in source comments that readers may never see.

```ts
describe('Shipping fee calculation', () => {
  it('shipping rules by order value and membership', ({ task }) => {
    story.init(task);

    story.section({
      title: 'Shipping fee policy',
      markdown: `
**Free shipping** applies when:
- Order total is £75 or more, OR
- Customer is a Premium member (any order value)

**Standard shipping** (£4.99) applies to all other domestic orders.

**International shipping** is always £14.99, regardless of order total or membership.
      `,
    });

    story.table({
      label: 'Shipping fee examples',
      columns: ['Order total', 'Premium?', 'Destination', 'Fee'],
      rows: [
        ['£100', 'No', 'Domestic', '£0 (free)'],
        ['£50', 'Yes', 'Domestic', '£0 (free)'],
        ['£50', 'No', 'Domestic', '£4.99'],
        ['£100', 'Yes', 'International', '£14.99'],
      ],
    });

    story.given('non-member "Tom" places a £50 domestic order');
    story.when('shipping fee is calculated');
    story.then('fee is £4.99');
  });
});
```

`story.section()` and `story.table()` are useful tools here, but the principle matters more than the tooling: important rules should be readable in the generated artifact, not buried in test logic.

## Avoid brittle detail

Specifications that mention specific UI elements, API endpoints, or database fields break when the implementation changes, even though the behaviour hasn't.

| Brittle                                            | Durable                      |
| -------------------------------------------------- | ---------------------------- |
| "Clicks the #submit-btn element"                   | "Submits the form"           |
| "Response body contains `{ status: 'ok' }`"        | "Registration succeeds"      |
| "Row inserted into users table with verified=true" | "Email address is confirmed" |
| "Redirects to /dashboard?tab=overview"             | "User sees their dashboard"  |

**The refactoring test:** If renaming a CSS class, changing an API response shape, or switching databases would break this scenario, it's too brittle for living documentation.

## Doc entries that age well

Not all documentation is equal for longevity. Some add lasting value; some add noise that obscures the specification.

| What to document        | Ages well                                 | Ages badly                          |
| ----------------------- | ----------------------------------------- | ----------------------------------- |
| Business rules in prose | Stating the policy that governs behaviour | Pasting implementation notes        |
| Decision tables         | Example sets that illustrate a rule       | Full database dumps                 |
| Diagrams                | State machines, business flows            | Sequence diagrams of internal calls |
| Explanatory notes       | Recording why a rule exists               | "TODO: fix this later"              |
| Key values              | Business-meaningful figures               | Debug variables                     |
| Structured data         | Example payloads or contracts             | Complete request/response dumps     |
| External links          | Links to stable policy documents          | Links to JIRA tickets (they move)   |

## Version your rules

When business rules change, update the specification — don't append.

```ts
// Appending creates confusion
story.note('Free shipping threshold was £50 until March 2024');
story.note('Free shipping threshold changed to £75 in March 2024');
story.note('Updated to £100 in January 2025');

// The specification reflects current truth
story.given('order total is £100 or more');
story.when('shipping fee is calculated');
story.then('shipping is free');
// Git history has the change trail. The spec shows what's true now.
```

The specification is not a changelog. It's the current truth. Use git history for what changed and when.

## Use tags for findability

Tags improve findability by connecting specifications to business concepts. When someone asks "what do we do for premium members?", filtering by tag gives the answer.

```ts
it('premium members get free returns', ({ task }) => {
  story.init(task, {
    tags: ['returns', 'premium', 'shipping'],
  });

  story.given('Premium member "Sarah" wants to return an item');
  story.when('Sarah requests a return');
  story.then('return shipping is free');
  story.and('a prepaid label is generated');
});
```

Delivery references like ticket IDs can help trace origin, but they should not carry essential business meaning. The specification should be self-contained without needing to look up the ticket.

### Tag for derived stakeholder surfaces

Use a small, intentional vocabulary. These conventions feed the Astro site;
arbitrary CI labels such as `slow` or `flaky` should not become audience
navigation.

| Convention | Use |
|---|---|
| `audience:stakeholder` / `audience:engineer` | Override the audience derived from file location only when necessary |
| `capability:<name>` | Group behaviour by a product capability |
| `journey:<id>:<n>` | Compose independently executable scenarios into an ordered walkthrough |
| `storyboard` | Mark a scenario carrying meaningful per-step screenshots for designers |
| `state:<name>` | Name a user-visible UI state for the state catalog |
| `viewport:<name>` | Put responsive variants of one state side by side |
| `support` | Include operationally useful behaviour in a support view |

Keep every journey member independently meaningful and executable. Do not split
one assertion across scenarios merely to make a longer walkthrough. A journey
is a derived reading order, not shared runtime state.

### Put design references next to the proof

Use the existing link doc API for stable design references:

```ts
story.link({
  label: 'Figma — Checkout v3',
  url: 'https://www.figma.com/design/checkout-v3',
});
```

Supported design-tool links, and deliberately `Design ...`-labelled links,
appear on story and journey pages. Keep the scenario self-contained: a mockup
can clarify intended presentation, but it must not be the only place the
business rule is described. Treat every external URL as untrusted input when
building a renderer.

### Make visual evidence purposeful

Capture a screenshot after a meaningful step, not after every interaction. A
sequence of step screenshots becomes a storyboard; `state:<name>` scenarios use
the first frame as their state-catalog thumbnail. Give every frame an `alt`
description that names the visible outcome rather than the browser mechanics.

### Show state changes with state snapshots

`story.state({ label?, value })` records what the world looks like at a step
as a data snapshot. Reports treat state snapshots like screenshots for non-UI
code: a step with state docs becomes a storyboard frame, consecutive snapshots
with the same label render as a diff (`items[0].qty: 1 → 2`), and multiple
labels appear as side-by-side lanes.

Use it when the behaviour is a data transformation a stakeholder should see:
a basket total after a discount, an order status after payment, a ledger entry
after settlement. Keep label discipline: pick one label per business entity
("Basket", "Order") and reuse it across steps so the diff lane stays coherent.
Snapshot the business-relevant projection, not the ORM entity — three fields a
product owner recognises beat forty columns of persistence noise, and the JS
adapters warn above ~100KB.

### Keep traceability auditable

Attach requirement tickets to the scenarios that actually prove them. The
traceability CSV emits untraced scenarios explicitly and grades each row's
evidence with the Evidence Review rules. A ticket link establishes provenance;
it does not upgrade weak proof into strong proof.

## Curate ruthlessly

Living documentation stays useful when the set remains small, current, and purposeful.

- Delete specs for removed behaviour.
- Merge duplicate scenarios that explain the same rule.
- Prefer one good decision table over many repetitive examples.
- Retire documentation-heavy scenarios that no longer teach anything.

A bloated suite is harder to trust than a smaller, well-curated one. If nobody would miss a scenario, remove it.

## Anti-patterns

### CRITICAL: Specifications nobody reads

Symptom: The generated reports exist but nobody opens them. Fix: Organise by business capability, write in domain language, review the generated documentation with stakeholders regularly.

### CRITICAL: Specification diverges from code

Symptom: The spec says one thing, the code does another, both pass. Fix: Every assertion must test actual behaviour. If the spec can pass without exercising the real code path, it is misleading.

### HIGH: Implementation language in specifications

Symptom: Stakeholders need a developer to translate the spec. Fix: Rewrite in domain language. If you can't express it without code terms, you don't understand the rule well enough.

### HIGH: Specs as a write-once activity

Symptom: Specs are written during the sprint and never touched again. Fix: Treat specs like code — refactor when the domain changes, delete when behaviour is removed.

### MEDIUM: Over-documenting with doc entries

Symptom: Every scenario has 5 JSON dumps and 3 screenshot captures. Fix: Doc entries should add context a reader needs, not data a debugger wants.

## Quick reference

| Principle               | Rule                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| Trusted source of truth | Stays aligned with behaviour because it runs against the system         |
| Organise by capability  | Mirror the business domain, not the code architecture                   |
| Two audiences           | Readable by developers and stakeholders                                 |
| Rules visible in output | State important rules in the generated artifact, not just in assertions |
| Avoid brittle detail    | If refactoring breaks the spec, the spec is too implementation-coupled  |
| Current truth only      | The spec shows what is true now — git has the history                   |
| Tags for findability    | Tag specs so they're searchable by business concept                     |
| Derived stakeholder views | Use capability, journey, storyboard, state, viewport, and audience conventions intentionally |
| Design beside proof     | Link stable mockups while keeping the governing rule self-contained      |
| Curate ruthlessly       | Delete, merge, and retire — a smaller set is more trustworthy           |
| Refactor specs          | Update when the domain changes, delete when behaviour is removed        |
