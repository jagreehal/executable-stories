---
title: Payment declined (Cypress)
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

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

it("Payment declined", () => {
  story.init();
  story.given("the user is on the checkout page");
  story.when("the user submits a declined card");
  story.then("the payment should be declined");
  story.then('the user should see "Payment failed"');
  story.but("the order should not be created");
});
```
