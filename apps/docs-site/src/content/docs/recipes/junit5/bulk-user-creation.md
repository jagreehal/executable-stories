---
title: Bulk user creation (JUnit 5)
description: DataTable for Given setup and expected result
---

## Generated output

```markdown
### ✅ Bulk user creation

- **Given** the following users exist
  **Users**
  | email             | role  | status |
  | ----------------- | ----- | ------ |
  | alice@example.com | admin | active |
  | bob@example.com   | user  | active |
  | eve@example.com   | user  | locked |
- **When** the admin opens the user list
- **Then** the user list should include
  **Expected**
  | email             | role  | status |
  | ----------------- | ----- | ------ |
  | alice@example.com | admin | active |
  | bob@example.com   | user  | active |
  | eve@example.com   | user  | locked |
```

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class UsersTest {
    @Test
    fun `bulk user creation`() {
        Story.init("Bulk user creation")
        Story.given("the following users exist")
        Story.table("Users",
            arrayOf("email", "role", "status"),
            arrayOf(
                arrayOf("alice@example.com", "admin", "active"),
                arrayOf("bob@example.com", "user", "active"),
                arrayOf("eve@example.com", "user", "locked"),
            )
        )
        Story.`when`("the admin opens the user list")
        Story.then("the user list should include")
        Story.table("Expected",
            arrayOf("email", "role", "status"),
            arrayOf(
                arrayOf("alice@example.com", "admin", "active"),
                arrayOf("bob@example.com", "user", "active"),
                arrayOf("eve@example.com", "user", "locked"),
            )
        )
    }
}
```
