---
title: Document status changes (Playwright)
description: Explicit state transition
---

## Generated output

```markdown
### ✅ Document status changes

- **Given** a document exists with status "draft"
- **When** the user submits the document
- **Then** the document status should change to "submitted"
- **And** an audit log entry should be created
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Document status changes", async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a document exists with status "draft"');
  story.when("the user submits the document");
  story.then('the document status should change to "submitted"');
  story.then("an audit log entry should be created");
});
```
