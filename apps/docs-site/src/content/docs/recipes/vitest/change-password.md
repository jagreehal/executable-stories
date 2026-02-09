---
title: Change password (Vitest)
description: Shared background, different When/Then
---

## Generated output

```markdown
### ✅ Change password

- **Given** the user account exists
- **And** the user is logged in
- **When** the user changes their password
- **Then** the user should be able to log in with the new password
```

## Vitest code

```typescript
it("Change password", ({ task }) => {
  story.init(task);
  story.given("the user account exists");
  story.given("the user is logged in");
  story.when("the user changes their password");
  story.then("the user should be able to log in with the new password");
});
```
