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
story("Payment declined", (s: StepsApi) => {
  s.given("the user is on the checkout page");
  s.when("the user submits a declined card");
  s.then("the payment should be declined");
  s.then('the user should see "Payment failed"');
  s.but("the order should not be created");
});
```
