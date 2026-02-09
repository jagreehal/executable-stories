---
title: Eligible customer gets discount (Vitest)
description: Rule block, positive path
---

## Generated output

```markdown
### ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **When** the customer checks out
- **Then** a discount should be applied
```

## Vitest code

```typescript
describe("Feature: Discounts", () => {
  describe("Rule: Discounts apply only to eligible customers", () => {
    it("Eligible customer gets discount", ({ task }) => {
      story.init(task);
      story.given("the customer is eligible for discounts");
      story.when("the customer checks out");
      story.then("a discount should be applied");
    });
  });
});
```
