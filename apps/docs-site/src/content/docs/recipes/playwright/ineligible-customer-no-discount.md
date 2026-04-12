---
title: Ineligible customer does not get discount (Playwright)
description: Rule block, negative path
---

## Generated output

```markdown
### ✅ Ineligible customer does not get discount

- **Given** the customer is not eligible for discounts
- **When** the customer checks out
- **Then** no discount should be applied
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Ineligible customer does not get discount", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the customer is not eligible for discounts");
  story.when("the customer checks out");
  story.then("no discount should be applied");
});
```
