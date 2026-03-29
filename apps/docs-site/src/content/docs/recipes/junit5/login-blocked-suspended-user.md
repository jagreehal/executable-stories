---
title: Login blocked for suspended user (JUnit 5)
description: Use of But for negative intent
---

## Generated output

```markdown
### ✅ Login blocked for suspended user

- **Given** the user account exists
- **And** the account is suspended
- **When** the user submits valid credentials
- **Then** the user should see an error message
- **But** the user should not be logged in
```

`but()` always renders as "But" (never auto-converted to "And").

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class LoginTest {
    @Test
    fun `login blocked for suspended user`() {
        Story.init("Login blocked for suspended user")
        Story.given("the user account exists")
        Story.given("the account is suspended")
        Story.`when`("the user submits valid credentials")
        Story.then("the user should see an error message")
        Story.but("the user should not be logged in")
    }
}
```
