---
title: Login blocked for suspended user (Cypress)
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

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

describe('Login', () => {
  it('Login blocked for suspended user', () => {
    story.init();
    story.given('the user account exists');
    story.given('the account is suspended');
    story.when('the user submits valid credentials');
    story.then('the user should see an error message');
    story.but('the user should not be logged in');
  });
});
```
