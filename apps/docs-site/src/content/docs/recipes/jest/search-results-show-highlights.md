---
title: Search results show highlights (Jest)
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

## Jest code

```typescript
import { story } from 'executable-stories-jest';

it("Search results show highlights", () => {
  story.init();
  story.given('the search index contains "hello world"');
  story.when('the user searches for "hello"');
  story.then('results should include "hello world"');
  story.and("the matching text should be highlighted");
});
```
