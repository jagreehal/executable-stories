---
title: Checkout calculates totals (Vitest)
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

## Vitest code

```typescript
story("Checkout calculates totals", (s: StepsApi) => {
  s.given("the cart has 2 items");
  s.when("the user proceeds to checkout");
  s.then("the subtotal should be $40.00");
  s.then("the tax should be $4.00");
  s.then("the total should be $44.00");
});
```
