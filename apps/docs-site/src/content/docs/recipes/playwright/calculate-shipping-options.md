---
title: Calculate shipping options (Playwright)
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

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Calculate shipping options", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the user has entered the shipping address");
  story.table({ label: "Address", columns: ["country", "state", "zip"], rows: [["US", "CA", "94107"]] });
  story.when("shipping options are calculated");
  story.then('the available options should include "Standard"');
  story.then('the available options should include "Express"');
  story.then("the estimated delivery date should be shown");
});
```
