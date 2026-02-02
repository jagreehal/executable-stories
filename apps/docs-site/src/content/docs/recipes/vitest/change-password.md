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
story("Change password", (s: StepsApi) => {
  background(s);
  s.when("the user changes their password");
  s.then("the user should be able to log in with the new password");
});
```

(With same `background` as Change email address.)
