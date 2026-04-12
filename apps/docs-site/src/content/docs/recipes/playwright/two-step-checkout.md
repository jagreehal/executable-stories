---
title: Two step checkout (Playwright)
description: Multiple When groups (phases)
---

## Generated output

```markdown
### ✅ Two step checkout

- **Given** the user has items in the cart
- **When** the user enters shipping information
- **And** the user selects a delivery option
- **And** the user enters payment information
- **And** the user confirms the order
- **Then** the order should be created
- **And** a confirmation email should be sent
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Two step checkout", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user has items in the cart");
  story.when("the user enters shipping information");
  story.when("the user selects a delivery option");
  story.when("the user enters payment information");
  story.when("the user confirms the order");
  story.then("the order should be created");
  story.then("a confirmation email should be sent");
});
```
