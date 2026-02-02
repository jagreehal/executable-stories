---
title: User updates profile details (Vitest)
description: Single Given, multiple When, single Then
---

## Generated output

```markdown
### ✅ User updates profile details

- **Given** the user is logged in
- **When** the user changes their display name
- **And** the user changes their time zone
- **And** the user saves the profile
- **Then** the profile should show the updated details
```

## Vitest code

```typescript
story("User updates profile details", (s: StepsApi) => {
  s.given("the user is logged in");
  s.when("the user changes their display name");
  s.when("the user changes their time zone");
  s.when("the user saves the profile");
  s.then("the profile should show the updated details");
});
```
