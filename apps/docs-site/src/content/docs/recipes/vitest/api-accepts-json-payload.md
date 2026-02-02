---
title: API accepts a JSON payload (Vitest)
description: DocString (JSON) with doc.json
---

## Generated output

```markdown
### ✅ API accepts a JSON payload

- **Given** the client has the following JSON payload
    **Payload**
    
    ```json
    {
      "email": "user@example.com",
      "password": "secret",
      "rememberMe": true
    }
    ```
    
- **When** the client sends the request
- **Then** the response status should be 200
- **And** the response body should include "token"
```

## Vitest code

```typescript
import { story, type StepsApi } from "vitest-executable-stories";

story("API accepts a JSON payload", (s: StepsApi) => {
  s.given("the client has the following JSON payload");
  s.doc.json("Payload", {
    email: "user@example.com",
    password: "secret",
    rememberMe: true,
  });
  s.when("the client sends the request");
  s.then("the response status should be 200");
  s.then('the response body should include "token"');
});
```

From `apps/vitest-example/src/replicate.story.test.ts`.
