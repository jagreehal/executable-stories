---
title: API accepts a JSON payload (pytest)
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

## pytest code

```python
from executable_stories import story

def test_api_accepts_json_payload():
    story.init("API accepts a JSON payload")
    story.given("the client has the following JSON payload")
    story.json("Payload", {
        "email": "user@example.com",
        "password": "secret",
        "rememberMe": True,
    })
    story.when("the client sends the request")
    story.then("the response status should be 200")
    story.then('the response body should include "token"')
```
