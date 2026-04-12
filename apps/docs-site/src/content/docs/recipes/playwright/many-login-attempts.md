---
title: Many login attempts (Playwright)
description: Scenario outline, multiple outcomes
---

## Generated output

Example: `Many login attempts: u1@example.com -> success`

```markdown
### ✅ Many login attempts: u1@example.com -> success

- **Given** the user is on the login page
- **When** the user logs in with "u1@example.com" and "secret"
- **Then** the login result should be "success"
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const manyLoginExamples = [
  { email: "u1@example.com", password: "secret", result: "success" },
  { email: "u2@example.com", password: "wrong", result: "fail" },
  // ...
];
for (const row of manyLoginExamples) {
  test(`Many login attempts: ${row.email} -> ${row.result}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given("the user is on the login page");
    story.when(`the user logs in with "${row.email}" and "${row.password}"`);
    story.then(`the login result should be "${row.result}"`);
  });
}
```
