---
title: User logs in successfully (JUnit 5)
description: Multiple Given, single When, single Then
---

## Generated output

This is what the reporter writes for this scenario:

```markdown
### ✅ User logs in successfully

- **Given** the user account exists
- **And** the user is on the login page
- **And** the account is active
- **When** the user submits valid credentials
- **Then** the user should see the dashboard
```

(First `given` renders as "Given"; subsequent ones in the same story render as "And".)

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class LoginTest {
    @Test
    fun `user logs in successfully`() {
        Story.init("User logs in successfully")
        Story.given("the user account exists")
        Story.given("the user is on the login page")
        Story.given("the account is active")
        Story.`when`("the user submits valid credentials")
        Story.then("the user should see the dashboard")
    }
}
```
