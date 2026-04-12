---
title: Password reset flow (Cypress)
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

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

it("Password reset flow", () => {
  story.init();
  story.given("the user account exists");
  story.given("the user has a verified email");
  story.when("the user requests a password reset");
  story.when("the user opens the reset email link");
  story.when("the user sets a new password");
  story.then("the user should be able to log in with the new password");
  story.then("the old password should no longer work");
});
```
