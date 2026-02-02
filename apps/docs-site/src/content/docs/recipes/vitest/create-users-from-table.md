---
title: Create users from table input (Vitest)
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

## Vitest code

```typescript
const createUserExamples = [
  { email: "a@example.com", role: "user" },
  { email: "admin@example.com", role: "admin" },
];
for (const row of createUserExamples) {
  story(`Create users from table input: ${row.email}`, (s: StepsApi) => {
    s.given("the admin is on the create user page");
    s.when("the admin submits the following user details");
    s.doc.table("Details", ["email", "role"], [[row.email, row.role]]);
    s.then(`the user "${row.email}" should exist with role "${row.role}"`);
  });
}
```
