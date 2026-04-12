---
title: Login works (Jest)
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

## Jest code

```typescript
import { story } from 'executable-stories-jest';

it("Login works", () => {
  story.init({ tags: ["smoke", "auth"] });
  story.given("the user is on the login page");
  story.when("the user logs in with valid credentials");
  story.then("the user should be logged in");
});
```
