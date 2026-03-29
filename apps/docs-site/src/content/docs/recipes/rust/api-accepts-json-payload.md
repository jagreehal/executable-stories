---
title: API accepts a JSON payload (Rust)
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

## Rust code

```rust
use executable_stories::Story;
use serde_json::json;

#[test]
fn test_api_accepts_json_payload() {
    let mut s = Story::new("API accepts a JSON payload");
    s.given("the client has the following JSON payload");
    s.json("Payload", &json!({
        "email": "user@example.com",
        "password": "secret",
        "rememberMe": true
    }));
    s.when("the client sends the request");
    s.then("the response status should be 200");
    s.then("the response body should include \"token\"");
    s.pass();
}
```
