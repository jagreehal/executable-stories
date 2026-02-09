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
it("User updates profile details", ({ task }) => {
  story.init(task);
  story.given("the user is logged in");
  story.when("the user changes their display name");
  story.when("the user changes their time zone");
  story.when("the user saves the profile");
  story.then("the profile should show the updated details");
});
```
