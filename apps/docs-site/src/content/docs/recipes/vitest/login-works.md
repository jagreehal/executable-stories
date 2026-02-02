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
story("Login works", { tags: ["smoke", "auth"] }, (s: StepsApi) => {
  s.given("the user is on the login page");
  s.when("the user logs in with valid credentials");
  s.then("the user should be logged in");
});
```
