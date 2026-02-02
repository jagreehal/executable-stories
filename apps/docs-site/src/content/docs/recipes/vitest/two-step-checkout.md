---
title: Two step checkout (Vitest)
description: Multiple When groups (phases)
---

## Generated output

```markdown
### ✅ Two step checkout

- **Given** the user has items in the cart
- **When** the user enters shipping information
- **And** the user selects a delivery option
- **And** the user enters payment information
- **And** the user confirms the order
- **Then** the order should be created
- **And** a confirmation email should be sent
```

## Vitest code

```typescript
story("Two step checkout", (s: StepsApi) => {
  s.given("the user has items in the cart");
  s.when("the user enters shipping information");
  s.when("the user selects a delivery option");
  s.when("the user enters payment information");
  s.when("the user confirms the order");
  s.then("the order should be created");
  s.then("a confirmation email should be sent");
});
```
