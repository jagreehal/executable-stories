---
title: Change password (Playwright)
description: Shared background, different When/Then
---

## Generated output

```markdown
### ✅ Change password

- **Given** the user account exists
- **And** the user is logged in
- **When** the user changes their password
- **Then** the user should be able to log in with the new password
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Change password", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user account exists");
  story.given("the user is logged in");
  story.when("the user changes their password");
  story.then("the user should be able to log in with the new password");
});
```
