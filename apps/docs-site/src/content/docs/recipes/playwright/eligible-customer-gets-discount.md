---
title: Eligible customer gets discount (Playwright)
description: Rule block, positive path
---

## Generated output

```markdown
### ✅ Eligible customer gets discount

- **Given** the customer is eligible for discounts
- **When** the customer checks out
- **Then** a discount should be applied
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe("Feature: Discounts", () => {
  test.describe("Rule: Discounts apply only to eligible customers", () => {
    test("Eligible customer gets discount", async ({}, testInfo) => {
      story.init(testInfo);
      story.given("the customer is eligible for discounts");
      story.when("the customer checks out");
      story.then("a discount should be applied");
    });
  });
});
```
