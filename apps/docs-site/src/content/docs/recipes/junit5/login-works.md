---
title: Login works (JUnit 5)
description: Story with tags
---

## Generated output

```markdown
### ✅ Login works
Tags: `smoke`, `auth`

- **Given** the user is on the login page
- **When** the user logs in with valid credentials
- **Then** the user should be logged in
```

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class LoginTest {
    @Test
    fun `login works`() {
        Story.init("Login works", "smoke", "auth")
        Story.given("the user is on the login page")
        Story.`when`("the user logs in with valid credentials")
        Story.then("the user should be logged in")
    }
}
```
