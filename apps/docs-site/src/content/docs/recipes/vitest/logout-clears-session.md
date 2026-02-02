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
story("Logout clears session", (s: StepsApi) => {
  s.given("the user is logged in");
  s.when("the user logs out");
  s.then("the session cookie should be cleared");
  s.then("the auth token should be revoked");
  s.then("the user should be redirected to the login page");
});
```
