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
import { story } from 'executable-stories-vitest';
import { describe, it } from 'vitest';

describe('Login', () => {
  it('User logs in successfully', ({ task }) => {
    story.init(task);
    story.given('the user account exists');
    story.given('the user is on the login page');
    story.given('the account is active');
    story.when('the user submits valid credentials');
    story.then('the user should see the dashboard');
  });
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
