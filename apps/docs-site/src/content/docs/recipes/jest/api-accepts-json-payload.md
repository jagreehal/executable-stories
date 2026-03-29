---
title: API accepts a JSON payload (Jest)
description: DocString (JSON) with doc.json
---

## Generated output

````markdown
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
````

## Jest code

```typescript
import { story } from 'executable-stories-jest';

describe('API', () => {
  it('API accepts a JSON payload', () => {
    story.init();
    story.given('the client has the following JSON payload');
    story.json({
      label: 'Payload',
      value: {
        email: 'user@example.com',
        password: 'secret',
        rememberMe: true,
      },
    });
    story.when('the client sends the request');
    story.then('the response status should be 200');
    story.then('the response body should include "token"');
  });
});
```
