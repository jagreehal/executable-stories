---
title: Guest checkout allowed (Vitest)
description: doc.note for But in Given
---

## Generated output

```markdown
### ✅ Guest checkout allowed

- **Given** the user is on the checkout page
- **And** the user is not logged in
    _Note:_ But guest checkout is enabled
- **When** the user submits an order as a guest
- **Then** the order should be created
```

## Vitest code

```typescript
story("Guest checkout allowed", (s: StepsApi) => {
  s.given("the user is on the checkout page");
  s.given("the user is not logged in");
  s.doc.note("But guest checkout is enabled");
  s.when("the user submits an order as a guest");
  s.then("the order should be created");
});
```
