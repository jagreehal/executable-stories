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
story("Ineligible customer does not get discount", (s: StepsApi) => {
  s.given("the customer is not eligible for discounts");
  s.when("the customer checks out");
  s.then("no discount should be applied");
});
```
