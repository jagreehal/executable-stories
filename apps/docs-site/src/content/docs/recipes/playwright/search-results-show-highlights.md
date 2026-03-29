---
title: Search results show highlights (Playwright)
description: And after Then
---

## Generated output

```markdown
### ✅ Search results show highlights

- **Given** the search index contains "hello world"
- **When** the user searches for "hello"
- **Then** results should include "hello world"
- **And** the matching text should be highlighted
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Search results show highlights", async ({}, testInfo) => {
  story.init(testInfo);
  story.given('the search index contains "hello world"');
  story.when('the user searches for "hello"');
  story.then('results should include "hello world"');
  story.and("the matching text should be highlighted");
});
```
