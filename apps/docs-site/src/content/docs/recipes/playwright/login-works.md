---
title: Login works (Playwright)
description: Story with tags
---

## Generated output

```markdown
### ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Login works", async ({}, testInfo) => {
  story.init(testInfo, { tags: ["smoke", "auth"] });
  story.given("the user is on the login page");
  story.when("the user logs in with valid credentials");
  story.then("the user should be logged in");
});
```
