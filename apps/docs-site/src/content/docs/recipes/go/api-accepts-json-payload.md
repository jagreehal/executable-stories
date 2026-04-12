---
title: API accepts a JSON payload (Go)
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

## Go code

```go
import (
    "testing"
    es "github.com/jagreehal/executable-stories/packages/executable-stories-go"
)

func TestAPIAcceptsJSONPayload(t *testing.T) {
    s := es.Init(t, "API accepts a JSON payload")
    s.Given("the client has the following JSON payload")
    s.JSON("Payload", map[string]interface{}{
        "email":      "user@example.com",
        "password":   "secret",
        "rememberMe": true,
    })
    s.When("the client sends the request")
    s.Then("the response status should be 200")
    s.Then(`the response body should include "token"`)
}
```
