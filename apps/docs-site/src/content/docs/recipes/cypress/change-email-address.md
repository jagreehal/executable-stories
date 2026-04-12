---
title: Change email address (Cypress)
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

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

describe("Feature: Account settings", () => {
  it("Change email address", () => {
    story.init();
    story.given("the user account exists");
    story.given("the user is logged in");
    story.when('the user updates their email to "new@example.com"');
    story.then("a verification email should be sent");
    story.then('the email status should be "pending verification"');
  });
});
```
