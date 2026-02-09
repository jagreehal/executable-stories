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
  it("Create order", ({ task }) => {
    story.init(task, { tags: ["db", "smoke"] });
    story.given("the database is seeded");
    story.given("the API is running");
    story.when("the client creates an order");
    story.then("the response status should be 201");
    story.then("the order should exist in the database");
  });
});
```
