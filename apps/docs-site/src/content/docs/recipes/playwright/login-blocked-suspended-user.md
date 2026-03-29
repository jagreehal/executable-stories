---
title: Login blocked for suspended user (Playwright)
description: Use of But for negative intent
---

## Generated output

```markdown
### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
```

`but()` always renders as "But" (never auto-converted to "And").

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe('Login', () => {
  test('Login blocked for suspended user', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```
