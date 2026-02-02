---
title: Search results show highlights (Vitest)
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

## Vitest code

```typescript
story("Search results show highlights", (s: StepsApi) => {
  s.given('the search index contains "hello world"');
  s.when('the user searches for "hello"');
  s.then('results should include "hello world"');
  s.and("the matching text should be highlighted");
});
```
