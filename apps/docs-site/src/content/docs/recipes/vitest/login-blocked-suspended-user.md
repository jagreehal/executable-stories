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
import { story } from 'executable-stories-vitest';
import { describe, it } from 'vitest';

describe('Login', () => {
  it('Login blocked for suspended user', ({ task }) => {
    story.init(task);
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
