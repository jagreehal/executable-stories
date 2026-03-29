---
title: Logout clears session (Playwright)
description: Repeated Then steps
---

## Generated output

```markdown
### ✅ Logout clears session

- **Given** the user is logged in
- **When** the user logs out
- **Then** the session cookie should be cleared
- **And** the auth token should be revoked
- **And** the user should be redirected to the login page
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Logout clears session", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user is logged in");
  story.when("the user logs out");
  story.then("the session cookie should be cleared");
  story.then("the auth token should be revoked");
  story.then("the user should be redirected to the login page");
});
```
