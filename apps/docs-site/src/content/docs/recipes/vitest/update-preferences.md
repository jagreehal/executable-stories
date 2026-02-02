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
story("Update preferences", (s: StepsApi) => {
  s.given("the user has the following preferences");
  s.doc.table("Preferences", ["key", "value"], [
    ["email_opt_in", "true"],
    ["theme", "dark"],
    ["timezone", "UTC"],
  ]);
  s.when("the user saves preferences");
  s.then("the preferences should be persisted");
});
```
