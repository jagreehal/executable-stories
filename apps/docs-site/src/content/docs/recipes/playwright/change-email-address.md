---
title: Change email address (Playwright)
description: Background for shared preconditions
---

## Generated output

```markdown
### ✅ Change email address

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their email to "new@example.com"
- **Then** a verification email should be sent
- **And** the email status should be "pending verification"
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe("Feature: Account settings", () => {
  test("Change email address", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("the user account exists");
    story.given("the user is logged in");
    story.when('the user updates their email to "new@example.com"');
    story.then("a verification email should be sent");
    story.then('the email status should be "pending verification"');
  });
});
```
