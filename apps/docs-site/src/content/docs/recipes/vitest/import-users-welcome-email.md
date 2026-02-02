---
title: Import users and send welcome email (Vitest)
description: DataTable + DocString (doc.table and doc.code)
---

## Generated output

```markdown
### ✅ Import users and send welcome email

- **Given** the following users are to be imported
    **Users**
    | email | name |
    | --- | --- |
    | a@example.com | Alice |
    | b@example.com | Bob |
- **And** the email template is
    **Template**
    ```
    Welcome {{name}}!
    Thanks for joining.
    ```
- **When** the import job runs
- **Then** the users should exist
- **And** welcome emails should be sent
```

## Vitest code

```typescript
story("Import users and send welcome email", (s: StepsApi) => {
  s.given("the following users are to be imported");
  s.doc.table("Users", ["email", "name"], [
    ["a@example.com", "Alice"],
    ["b@example.com", "Bob"],
  ]);
  s.and("the email template is");
  s.doc.code("Template", `Welcome {{name}}!
Thanks for joining.`);
  s.when("the import job runs");
  s.then("the users should exist");
  s.then("welcome emails should be sent");
});
```
