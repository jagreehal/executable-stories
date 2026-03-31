---
name: executable-stories-junit5
description: Write Given/When/Then story tests for JUnit 5 with structured report generation. Use when creating BDD-style tests in Kotlin or Java and generating user story documentation from JUnit tests.
version: 0.1.0
libraries: ['junit5', 'kotlin', 'java']
---

# executable-stories-junit5

Framework-native story testing for JUnit 5. Tests and documentation come from the same JUnit code.

## Quick Start

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CartCheckoutTest {
    @Test
    fun `applies discount code`() {
        Story.init("Applies discount code", "checkout") // tags as varargs
        Story.ticket("CART-42") // or Story.ticket("CART-42", "https://jira.example.com/CART-42")

        Story.given("a cart with items totaling $100")
        val cart = createCart()

        Story.`when`("a 20% discount code is applied")
        applyDiscount(cart, "SAVE20")

        Story.then("the total is $80")
        assertEquals(80, cart.total)
    }
}
```

`when` is a Kotlin keyword, so call it as ``Story.`when`("...")`` or use `Story.execute(...)`.

## API Reference

### Story.init(scenario, vararg tags)

Initialize a story at the start of the test.

```kotlin
Story.init("Login succeeds", "smoke", "auth")
Story.withTraceUrlTemplate("https://jaeger.example.com/trace/{traceId}")
```

### Step Markers

Use static step methods directly inside a normal JUnit test.

```kotlin
Story.given("a seeded database")
val db = seedDb()

Story.`when`("the service loads the account")
val account = loadAccount(db)

Story.then("the account is active")
assertEquals(true, account.active)
```

| Method           | Keyword | Purpose            |
| ---------------- | ------- | ------------------ |
| `Story.given()`  | Given   | Precondition/setup |
| `Story.execute()`| When    | Action             |
| `Story.then()`   | Then    | Assertion          |
| `Story.and()`    | And     | Continuation       |
| `Story.but()`    | But     | Negative contrast  |

Repeated `given`, `when`, and `then` calls auto-render as `And`. Explicit `and` and `but` keep their own keywords.

### Step Aliases

```kotlin
Story.arrange("setup")
Story.act("action")
Story.assertThat("check")

Story.setup("initial state")
Story.context("extra context")
Story.execute("operation")
Story.action("user action")
Story.verify("outcome")
```

### Wrapped Steps

```kotlin
val profile = Story.fn<Profile>("When", "the profile is fetched") {
    fetchProfile("user-123")
}

Story.expect("the profile contains the correct name") {
    assertEquals("Alice", profile.name)
}
```

### Standalone Doc Methods

Call doc methods after a step to attach them to that step, or before any step to attach them at story level.

```kotlin
Story.given("a valid payment request")
Story.json("Request payload", mapOf("amount" to 50, "currency" to "USD"))
Story.kv("Gateway", "stripe")

Story.`when`("the payment is submitted")
Story.code("Response", """{ "status": "ok" }""", "json")

Story.then("the order is confirmed")
Story.table(
    "Order summary",
    arrayOf("Item", "Qty", "Price"),
    arrayOf(arrayOf("Widget", "2", "$25")),
)
Story.link("API docs", "https://docs.example.com/payments")
Story.note("Payment processed in sandbox mode")
```

### Inline Docs

Step markers accept `vararg DocEntry` attachments:

```kotlin
Story.given(
    "valid credentials",
    DocEntry.kv("username", "alice"),
    DocEntry.note("Password masked for security"),
)
```

### Nested Doc Children

Nested docs are built with `DocEntry` factory methods. When a child is nested later, it is removed from earlier flat story-level or step-level doc lists and kept only under the parent.

```kotlin
val child = Story.note("shared child")

Story.`when`(
    "the second step",
    DocEntry.note("parent note", children = listOf(child)),
)
```

You can also attach multiple doc entries directly to a step:

```kotlin
val child1 = DocEntry.kv("User", "alice")
val child2 = DocEntry.note("note about user")

Story.given("a user exists", child1, child2)
```

## Reporting

Output is automatic through the JUnit 5 `TestExecutionListener` and writes `.executable-stories/raw-run.json` after the run. Override the path with `EXECUTABLE_STORIES_OUTPUT`.

## Common Mistakes

### Missing Story.init()

Call `Story.init(...)` before steps or doc helpers.

### Forgetting Kotlin backticks on when

Use ``Story.`when`(...)`` or the alias `Story.execute(...)`.

### Disabling listener discovery

If your launcher disables service auto-discovery, register `dev.executablestories.junit5.StoryTestExecutionListener` manually.
