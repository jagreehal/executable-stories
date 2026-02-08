---
title: Calculate shipping options (Vitest)
description: DataTable for input, multiple Then
---

## Generated output

```markdown
### ✅ Calculate shipping options

- **Given** the user has entered the shipping address
    **Address**
    | country | state | zip |
    | --- | --- | --- |
    | US | CA | 94107 |
- **When** shipping options are calculated
- **Then** the available options should include "Standard"
- **And** the available options should include "Express"
- **And** the estimated delivery date should be shown
```

## Vitest code

```typescript
it("Calculate shipping options", ({ task }) => {
  story.init(task);
  story.given("the user has entered the shipping address");
  story.table({ label: "Address", columns: ["country", "state", "zip"], rows: [["US", "CA", "94107"]] });
  story.when("shipping options are calculated");
  story.then('the available options should include "Standard"');
  story.then('the available options should include "Express"');
  story.then("the estimated delivery date should be shown");
});
```
