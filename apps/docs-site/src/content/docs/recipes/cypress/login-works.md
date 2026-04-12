---
title: Login works (Cypress)
description: Story with tags
---

## Generated output

```markdown
### ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in
```

## Cypress code

```typescript
import { story } from 'executable-stories-cypress';

it("Login works", () => {
  story.init({ tags: ["smoke", "auth"] });
  story.given("the user is on the login page");
  story.when("the user logs in with valid credentials");
  story.then("the user should be logged in");
});
```
