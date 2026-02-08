---
title: Ineligible customer does not get discount (Vitest)
description: Rule block, negative path
---

## Generated output

```markdown
### ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **When** the customer checks out
- **Then** no discount should be applied
```

## Vitest code

```typescript
it("Ineligible customer does not get discount", ({ task }) => {
  story.init(task);
  story.given("the customer is not eligible for discounts");
  story.when("the customer checks out");
  story.then("no discount should be applied");
});
```
