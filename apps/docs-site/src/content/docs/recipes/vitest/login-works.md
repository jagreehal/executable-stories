---
title: Login works (Vitest)
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

## Vitest code

```typescript
it("Login works", ({ task }) => {
  story.init(task, { tags: ["smoke", "auth"] });
  story.given("the user is on the login page");
  story.when("the user logs in with valid credentials");
  story.then("the user should be logged in");
});
```
