---
title: Checkout calculates totals (Playwright)
description: Single Given, single When, multiple Then
---

## Generated output

```markdown
### ✅ Checkout calculates totals

- **Given** the cart has 2 items
- **When** the user proceeds to checkout
- **Then** the subtotal should be $40.00
- **And** the tax should be $4.00
- **And** the total should be $44.00
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Checkout calculates totals", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the cart has 2 items");
  story.when("the user proceeds to checkout");
  story.then("the subtotal should be $40.00");
  story.then("the tax should be $4.00");
  story.then("the total should be $44.00");
});
```
