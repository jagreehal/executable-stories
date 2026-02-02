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
    story("Eligible customer gets discount", (s: StepsApi) => {
      s.given("the customer is eligible for discounts");
      s.when("the customer checks out");
      s.then("a discount should be applied");
    });
  });
});
```
