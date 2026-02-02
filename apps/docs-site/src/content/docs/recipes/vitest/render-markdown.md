---
title: Render markdown (Vitest)
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

## Vitest code

```typescript
story("Render markdown", (s: StepsApi) => {
  s.given("the markdown input is");
  s.doc.code("Markdown", `# Title
- Item 1
- Item 2`, "markdown");
  s.when("the user previews the markdown");
  s.then('the preview should show a heading "Title"');
  s.then("the preview should show a list with 2 items");
});
```
