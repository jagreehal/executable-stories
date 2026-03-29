---
title: Render markdown (Playwright)
description: DocString for Markdown with doc.code
---

## Generated output

```markdown
### ✅ Render markdown

- **Given** the markdown input is
    **Markdown**
    ```markdown
    # Title
    - Item 1
    - Item 2
    ```
- **When** the user previews the markdown
- **Then** the preview should show a heading "Title"
- **And** the preview should show a list with 2 items
```

## Playwright code

```typescript
import { test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test("Render markdown", async ({}, testInfo) => {
  story.init(testInfo);
  story.given("the markdown input is");
  story.code({
    label: "Markdown",
    content: `# Title\n- Item 1\n- Item 2`,
    lang: "markdown",
  });
  story.when("the user previews the markdown");
  story.then('the preview should show a heading "Title"');
  story.then("the preview should show a list with 2 items");
});
```
