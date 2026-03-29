---
title: Report shows fields in order (Playwright)
description: And in middle of Then
---

## Generated output

```markdown
### ✅ Report shows fields in order

- **Given** a report exists for account "A1"
- **When** the user downloads the report
- **Then** the report header should be "Account Report"
- **And** the first column should be "Date"
- **And** the second column should be "Amount"
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Report shows fields in order", async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a report exists for account "A1"');
  story.when("the user downloads the report");
  story.then('the report header should be "Account Report"');
  story.and('the first column should be "Date"');
  story.and('the second column should be "Amount"');
});
```
