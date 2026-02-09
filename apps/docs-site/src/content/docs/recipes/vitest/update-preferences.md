---
title: Update preferences (Vitest)
description: DataTable as key-value pairs
---

## Generated output

```markdown
### ✅ Update preferences

- **Given** the user has the following preferences
    **Preferences**
    | key | value |
    | --- | --- |
    | email_opt_in | true |
    | theme | dark |
    | timezone | UTC |
- **When** the user saves preferences
- **Then** the preferences should be persisted
```

## Vitest code

```typescript
it("Update preferences", ({ task }) => {
  story.init(task);
  story.given("the user has the following preferences");
  story.table({
    label: "Preferences",
    columns: ["key", "value"],
    rows: [
      ["email_opt_in", "true"],
      ["theme", "dark"],
      ["timezone", "UTC"],
    ],
  });
  story.when("the user saves preferences");
  story.then("the preferences should be persisted");
});
```
