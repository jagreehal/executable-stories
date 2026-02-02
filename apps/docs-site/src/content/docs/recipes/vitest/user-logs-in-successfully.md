---
title: User logs in successfully (Vitest)
description: Multiple Given, single When, single Then
---

## Generated output

This is what the reporter writes for this scenario:

```markdown
### ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

(First `given` renders as "Given"; subsequent ones in the same story render as "And".)

## Vitest code

```typescript
import { story, type StepsApi } from "vitest-executable-stories";

story("User logs in successfully", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the user is on the login page");
  s.given("the account is active");
  s.when("the user submits valid credentials");
  s.then("the user should see the dashboard");
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
