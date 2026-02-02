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
story("Document status changes", (s: StepsApi) => {
  s.given('a document exists with status "draft"');
  s.when("the user submits the document");
  s.then('the document status should change to "submitted"');
  s.then("an audit log entry should be created");
});
```
