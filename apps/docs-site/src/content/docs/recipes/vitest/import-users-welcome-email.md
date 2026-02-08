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
it("Import users and send welcome email", ({ task }) => {
  story.init(task);
  story.given("the following users are to be imported");
  story.table({
    label: "Users",
    columns: ["email", "name"],
    rows: [
      ["a@example.com", "Alice"],
      ["b@example.com", "Bob"],
    ],
  });
  story.and("the email template is");
  story.code({
    label: "Template",
    content: `Welcome {{name}}!\nThanks for joining.`,
  });
  story.when("the import job runs");
  story.then("the users should exist");
  story.then("welcome emails should be sent");
});
```
