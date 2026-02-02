---
title: Bulk user creation (Vitest)
description: DataTable for Given setup and expected result
---

## Generated output

```markdown
### ✅ Bulk user creation

- **Given** the following users exist
    **Users**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | eve@example.com | user | locked |
    
- **When** the admin opens the user list
- **Then** the user list should include
    **Expected**
    
    | email | role | status |
    | --- | --- | --- |
    | alice@example.com | admin | active |
    | bob@example.com | user | active |
    | eve@example.com | user | locked |
```

## Vitest code

```typescript
import { story, type StepsApi } from "vitest-executable-stories";

story("Bulk user creation", (s: StepsApi) => {
  s.given("the following users exist");
  s.doc.table("Users", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
  s.when("the admin opens the user list");
  s.then("the user list should include");
  s.doc.table("Expected", ["email", "role", "status"], [
    ["alice@example.com", "admin", "active"],
    ["bob@example.com", "user", "active"],
    ["eve@example.com", "user", "locked"],
  ]);
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
