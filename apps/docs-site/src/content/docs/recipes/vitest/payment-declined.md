---
title: Payment declined (Vitest)
description: Negative path with Then and But
---

## Generated output

```markdown
### ✅ Payment declined

- **Given** the user is on the checkout page
- **When** the user submits a declined card
- **Then** the payment should be declined
- **And** the user should see "Payment failed"
- **But** the order should not be created
```

## Vitest code

```typescript
it("Payment declined", ({ task }) => {
  story.init(task);
  story.given("the user is on the checkout page");
  story.when("the user submits a declined card");
  story.then("the payment should be declined");
  story.then('the user should see "Payment failed"');
  story.but("the order should not be created");
});
```
