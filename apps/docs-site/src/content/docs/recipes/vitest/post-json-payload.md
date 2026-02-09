---
title: Post JSON payload (Vitest)
description: Scenario outline with doc.json
---

## Generated output

Example: `Post JSON payload: 123 -> 200`

```markdown
### ✅ Post JSON payload: 123 -> 200

- **Given** the payload is
    **Payload**
    ```json
    { "id": "123", "status": "active" }
    ```
- **When** the client posts the payload
- **Then** the response status should be 200
```

## Vitest code

```typescript
const postPayloadExamples = [
  { id: "123", status: "active", code: "200" },
  { id: "456", status: "invalid", code: "400" },
];
for (const row of postPayloadExamples) {
  it(`Post JSON payload: ${row.id} -> ${row.code}`, ({ task }) => {
    story.init(task);
    story.given("the payload is");
    story.json({ label: "Payload", value: { id: row.id, status: row.status } });
    story.when("the client posts the payload");
    story.then(`the response status should be ${row.code}`);
  });
}
```
