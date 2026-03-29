---
title: Guest checkout allowed (Playwright)
description: doc.note for But in Given
---

## Generated output

```markdown
### ✅ Guest checkout allowed

- **Given** the user is on the checkout page
- **And** the user is not logged in
    _Note:_ But guest checkout is enabled
- **When** the user submits an order as a guest
- **Then** the order should be created
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Guest checkout allowed", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user is on the checkout page");
  story.given("the user is not logged in");
  story.note("But guest checkout is enabled");
  story.when("the user submits an order as a guest");
  story.then("the order should be created");
});
```
