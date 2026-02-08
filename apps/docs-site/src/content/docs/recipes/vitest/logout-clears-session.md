---
title: Logout clears session (Vitest)
description: Repeated Then steps
---

## Generated output

```markdown
### ✅ Logout clears session

- **Given** the user is logged in
- **When** the user logs out
- **Then** the session cookie should be cleared
- **And** the auth token should be revoked
- **And** the user should be redirected to the login page
```

## Vitest code

```typescript
it("Logout clears session", ({ task }) => {
  story.init(task);
  story.given("the user is logged in");
  story.when("the user logs out");
  story.then("the session cookie should be cleared");
  story.then("the auth token should be revoked");
  story.then("the user should be redirected to the login page");
});
```
