---
title: Eligible customer gets discount (Cypress)
description: Rule block, positive path
---

## Generated output

```markdown
### ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **When** the customer checks out
- **Then** a discount should be applied
```

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

describe("Feature: Discounts", () => {
  describe("Rule: Discounts apply only to eligible customers", () => {
    it("Eligible customer gets discount", () => {
      story.init();
      story.given("the customer is eligible for discounts");
      story.when("the customer checks out");
      story.then("a discount should be applied");
    });
  });
});
```
