---
title: Change email address (Vitest)
description: Background for shared preconditions
---

## Generated output

```markdown
### ✅ Change email address

- **Given** the user account exists
- **And** the user is logged in
- **When** the user updates their email to "new@example.com"
- **Then** a verification email should be sent
- **And** the email status should be "pending verification"
```

## Vitest code

```typescript
describe("Feature: Account settings", () => {
  const background = (s: StepsApi) => {
    s.given("the user account exists");
    s.given("the user is logged in");
  };

  story("Change email address", (s: StepsApi) => {
    background(s);
    s.when('the user updates their email to "new@example.com"');
    s.then("a verification email should be sent");
    s.then('the email status should be "pending verification"');
  });
});
```
