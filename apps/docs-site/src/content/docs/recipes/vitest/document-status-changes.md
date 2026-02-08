---
title: Document status changes (Vitest)
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

## Vitest code

```typescript
it("Document status changes", ({ task }) => {
  story.init(task);
  story.given('a document exists with status "draft"');
  story.when("the user submits the document");
  story.then('the document status should change to "submitted"');
  story.then("an audit log entry should be created");
});
```
