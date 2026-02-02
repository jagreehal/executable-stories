---
title: Password reset flow (Vitest)
description: Multiple Given, multiple When, multiple Then
---

## Generated output

```markdown
### ✅ Password reset flow

- **Given** the user account exists
- **And** the user has a verified email
- **When** the user requests a password reset
- **And** the user opens the reset email link
- **And** the user sets a new password
- **Then** the user should be able to log in with the new password
- **And** the old password should no longer work
```

## Vitest code

```typescript
story("Password reset flow", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the user has a verified email");
  s.when("the user requests a password reset");
  s.when("the user opens the reset email link");
  s.when("the user sets a new password");
  s.then("the user should be able to log in with the new password");
  s.then("the old password should no longer work");
});
```
