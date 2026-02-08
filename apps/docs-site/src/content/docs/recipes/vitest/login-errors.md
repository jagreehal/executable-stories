---
title: Login errors (Vitest)
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

## Vitest code

```typescript
const loginErrorExamples = [
  { email: "user@example.com", password: "wrong", message: "Invalid credentials" },
  { email: "locked@example.com", password: "secret", message: "Account is locked" },
  { email: "unknown@example.com", password: "secret", message: "Invalid credentials" },
];
for (const row of loginErrorExamples) {
  it(`Login errors: ${row.message}`, ({ task }) => {
    story.init(task);
    story.given("the user is on the login page");
    story.when(`the user logs in with "${row.email}" and "${row.password}"`);
    story.then(`the error message should be "${row.message}"`);
  });
}
```
