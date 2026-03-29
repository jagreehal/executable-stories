---
title: User updates profile details (Playwright)
description: Single Given, multiple When, single Then
---

## Generated output

```markdown
### ✅ User updates profile details

- **Given** the user is logged in
- **When** the user changes their display name
- **And** the user changes their time zone
- **And** the user saves the profile
- **Then** the profile should show the updated details
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("User updates profile details", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user is logged in");
  story.when("the user changes their display name");
  story.when("the user changes their time zone");
  story.when("the user saves the profile");
  story.then("the profile should show the updated details");
});
```
