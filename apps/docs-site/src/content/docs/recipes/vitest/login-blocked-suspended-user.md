---
title: Login blocked for suspended user (Vitest)
description: Use of But for negative intent
---

## Generated output

```markdown
### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
```

`but()` always renders as "But" (never auto-converted to "And").

## Vitest code

```typescript
import { story, type StepsApi } from "vitest-executable-stories";

story("Login blocked for suspended user", (s: StepsApi) => {
  s.given("the user account exists");
  s.given("the account is suspended");
  s.when("the user submits valid credentials");
  s.then("the user should see an error message");
  s.but("the user should not be logged in");
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
