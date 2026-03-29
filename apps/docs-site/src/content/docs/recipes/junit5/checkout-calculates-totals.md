---
title: Checkout calculates totals (JUnit 5)
description: Single Given, single When, multiple Then
---

## Generated output

```markdown
### ✅ Checkout calculates totals

- **Given** the cart has 2 items
- **When** the user proceeds to checkout
- **Then** the subtotal should be $40.00
- **And** the tax should be $4.00
- **And** the total should be $44.00
```

## Kotlin code

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test

class CheckoutTest {
    @Test
    fun `checkout calculates totals`() {
        Story.init("Checkout calculates totals")
        Story.given("the cart has 2 items")
        Story.`when`("the user proceeds to checkout")
        Story.then("the subtotal should be $40.00")
        Story.then("the tax should be $4.00")
        Story.then("the total should be $44.00")
    }
}
```
