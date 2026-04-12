---
title: Create order (JUnit 5)
description: Background and tags
---

## Generated output

```markdown
### ✅ Create order
Tags: `db`, `smoke`

- **Given** the database is seeded
- **And** the API is running
- **When** the client creates an order
- **Then** the response status should be 201
- **And** the order should exist in the database
```

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class OrdersTest {
    @Test
    fun `create order`() {
        Story.init("Create order", "db", "smoke")
        Story.given("the database is seeded")
        Story.given("the API is running")
        Story.`when`("the client creates an order")
        Story.then("the response status should be 201")
        Story.then("the order should exist in the database")
    }
}
```
