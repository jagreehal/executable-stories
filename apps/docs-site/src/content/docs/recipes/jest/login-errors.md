---
title: Login errors (Jest)
description: Scenario outline with loop
---

## Generated output

Example for one row:

```markdown
### ✅ Login errors: Account is locked

- **Given** the user is on the login page
- **When** the user logs in with "locked@example.com" and "secret"
- **Then** the error message should be "Account is locked"
```

## Jest code

```typescript
import { story } from 'executable-stories-jest';

const loginErrorExamples = [
  { email: "user@example.com", password: "wrong", message: "Invalid credentials" },
  { email: "locked@example.com", password: "secret", message: "Account is locked" },
  { email: "unknown@example.com", password: "secret", message: "Invalid credentials" },
];
for (const row of loginErrorExamples) {
  it(`Login errors: ${row.message}`, () => {
    story.init();
    story.given("the user is on the login page");
    story.when(`the user logs in with "${row.email}" and "${row.password}"`);
    story.then(`the error message should be "${row.message}"`);
  });
}
```
