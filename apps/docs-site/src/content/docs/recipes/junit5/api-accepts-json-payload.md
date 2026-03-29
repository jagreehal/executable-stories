---
title: API accepts a JSON payload (JUnit 5)
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

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class ApiTest {
    @Test
    fun `api accepts a json payload`() {
        Story.init("API accepts a JSON payload")
        Story.given("the client has the following JSON payload")
        Story.json("Payload", mapOf(
            "email" to "user@example.com",
            "password" to "secret",
            "rememberMe" to true
        ))
        Story.`when`("the client sends the request")
        Story.then("the response status should be 200")
        Story.then("the response body should include \"token\"")
    }
}
```
