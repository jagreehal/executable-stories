---
title: Create order (Vitest)
description: Background and tags
---

## Generated output

```markdown
### ✅ Create order
Tags: `db`, `smoke`

- **Given** the database is seeded
- **And** the API is running
- **When** the client creates an order
- **Then** the response status should be 201
- **And** the order should exist in the database
```

## Vitest code

```typescript
describe("Feature: Orders", () => {
  story("Create order", { tags: ["db", "smoke"] }, (s: StepsApi) => {
    s.given("the database is seeded");
    s.given("the API is running");
    s.when("the client creates an order");
    s.then("the response status should be 201");
    s.then("the order should exist in the database");
  });
});
```
