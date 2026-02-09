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
it("Checkout calculates totals", ({ task }) => {
  story.init(task);
  story.given("the cart has 2 items");
  story.when("the user proceeds to checkout");
  story.then("the subtotal should be $40.00");
  story.then("the tax should be $4.00");
  story.then("the total should be $44.00");
});
```
