---
title: Payment declined (Playwright)
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

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Payment declined", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user is on the checkout page");
  story.when("the user submits a declined card");
  story.then("the payment should be declined");
  story.then('the user should see "Payment failed"');
  story.but("the order should not be created");
});
```
