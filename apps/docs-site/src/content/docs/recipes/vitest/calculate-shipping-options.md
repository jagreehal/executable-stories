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
story("Calculate shipping options", (s: StepsApi) => {
  s.given("the user has entered the shipping address");
  s.doc.table("Address", ["country", "state", "zip"], [["US", "CA", "94107"]]);
  s.when("shipping options are calculated");
  s.then('the available options should include "Standard"');
  s.then('the available options should include "Express"');
  s.then("the estimated delivery date should be shown");
});
```
