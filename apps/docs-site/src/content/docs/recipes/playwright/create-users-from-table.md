---
title: Create users from table input (Playwright)
description: Scenario outline with doc.table
---

## Generated output

Example: `Create users from table input: a@example.com`

```markdown
### ✅ Create users from table input: a@example.com

- **Given** the admin is on the create user page
- **When** the admin submits the following user details
    **Details**
    | email | role |
    | --- | --- |
    | a@example.com | user |
- **Then** the user "a@example.com" should exist with role "user"
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

const createUserExamples = [
  { email: "a@example.com", role: "user" },
  { email: "admin@example.com", role: "admin" },
];
for (const row of createUserExamples) {
  test(`Create users from table input: ${row.email}`, async ({}, testInfo) => {
    story.init(testInfo);
    story.given("the admin is on the create user page");
    story.when("the admin submits the following user details");
    story.table({
      label: "Details",
      columns: ["email", "role"],
      rows: [[row.email, row.role]],
    });
    story.then(`the user "${row.email}" should exist with role "${row.role}"`);
  });
}
```
