---
name: junit5-story-api
description: >
  Write BDD stories in JUnit 5 (Kotlin/Java) using executable-stories-junit5.
  Static API: Story.init(scenario), Story.given/when/then/and/but. Aliases:
  arrange, act, assertThat, setup, context, execute, action, verify. Steps
  accept vararg DocEntry for inline docs. Auto-And keyword conversion. Wrapped
  steps: Story.fn, Story.expect. Automatic JSON output via TestExecutionListener.
type: core
library: executable-stories-junit5
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/Story.kt"
---

# executable-stories-junit5 — Story API

## Setup

```kotlin
import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals

class CartCheckoutTest {
    @Test
    fun `applies discount code`() {
        Story.init("Applies discount code", "checkout")
        Story.covers("src/main/kotlin/checkout/Total.kt")

        Story.given("a cart with items totaling $100")
        val cart = createCart(listOf(Item("Shirt", 100)))

        Story.`when`("a 20% discount code is applied")
        applyDiscount(cart, "SAVE20")

        Story.then("the total is $80")
        assertEquals(80, cart.total)

        Story.and("the discount is shown in the summary")
        assertEquals(1, cart.discounts.size)
    }
}
```

Note: `when` is a Kotlin keyword, so it must be escaped with backticks: `` Story.`when`("...") ``.

Output is automatic via JUnit 5's `TestExecutionListener` SPI — `.executable-stories/raw-run.json` is written after all tests complete. Override with `EXECUTABLE_STORIES_OUTPUT` env var.

## Core Patterns

### Step markers with Auto-And conversion

First call to `given()`, `when()`, or `then()` renders the keyword as-is. Subsequent calls to the same keyword auto-convert to "And". Explicit `and()` always renders "And". Explicit `but()` always renders "But" and never auto-converts.

```kotlin
@Test
fun `blocks suspended user login`() {
    Story.init("Blocks suspended user login")

    Story.given("the user account exists")         // renders "Given"
    Story.given("the account is suspended")         // renders "And" (auto-converted)
    Story.`when`("the user submits valid credentials")
    Story.then("the user sees an error message")
    Story.but("the user is not logged in")          // renders "But" (always)
}
```

### Step aliases

AAA pattern: `Story.arrange()` (Given), `Story.act()` (When), `Story.assertThat()` (Then).

Additional: `Story.setup()`, `Story.context()` (Given), `Story.execute()`, `Story.action()` (When), `Story.verify()` (Then).

### Doc entries attached to steps

```kotlin
@Test
fun `processes payment`() {
    Story.init("Processes payment")

    Story.given("a valid payment request")
    Story.json("Request payload", mapOf("amount" to 50, "currency" to "USD"))
    Story.kv("Gateway", "stripe")

    Story.`when`("the payment is submitted")
    Story.code("Response", """{ "status": "ok" }""", "json")

    Story.then("the order is confirmed")
    Story.table("Order summary",
        arrayOf("Item", "Qty", "Price"),
        arrayOf(arrayOf("Widget", "2", "$25"))
    )
    Story.link("API docs", "https://docs.example.com/payments")
    Story.note("Payment processed in sandbox mode")
}
```

### Embedded HTML

Embed generated HTML (charts, single-file reports, skill/agent output) in an
always-sandboxed iframe in the report. Exactly one of `path` / `url` / `content`
is required; optional `title` and `height` (number → px, string passed through; default 400px).

```kotlin
Story.html(content = chartHtml, title = "Latency chart", height = 600)
Story.html(url = "https://dash.example.com/run/42", height = 600)
Story.html(path = "./reports/summary.html", title = "Summary")
```

**Source guidance:** generated/ephemeral HTML (a skill writing to a temp dir) → pass `content`
(captured now, survives temp-dir cleanup). Stable on-disk artifact → pass `path` (inlined at format time).

**The embedded HTML must be self-contained (a single file).** Local files are inlined as the
iframe's `srcdoc`; relative references to sibling CSS/JS/images are not rewritten, so a multi-file
report renders broken. Use a single-file/inline mode or pass markup via `content`. Directory bundling is planned.

**Sandbox-safe contract:** renders inside `<iframe sandbox="allow-scripts">` (opaque origin, no
allow-same-origin). CDN scripts (Tailwind, Mermaid) and inline DOM scripts work; `localStorage`/
`sessionStorage`/cookies throw `SecurityError` (and an unguarded access aborts the rest of that
script block) — guard with try/catch or avoid. No `window.top`/parent access; no popups.

### Inline docs via vararg DocEntry

```kotlin
Story.given("valid credentials",
    DocEntry.kv("username", "alice"),
    DocEntry.note("Password masked for security")
)
```

### Step wrappers with timing

```kotlin
val profile = Story.fn<Profile>("When", "the profile is fetched") {
    fetchProfile("user-123")
}

Story.expect("the profile contains the correct name") {
    assertEquals("Alice", profile.name)
}
```

`fn` and `expect` wrap a callable as a step with automatic timing. Both have `Runnable` (void) and `Supplier<T>` (returns value) overloads.

### Manual step timing

```kotlin
Story.given("a step to time")
val token = Story.startTimer()
// ... work ...
Story.endTimer(token)
```

### Attachments

```kotlin
Story.attach("debug.log", "text/plain", "/tmp/debug.log")
Story.attachInline("config", "application/json", """{"key":"val"}""", "IDENTITY")
```

## Common Mistakes

### CRITICAL Missing Story.init() before steps

Wrong:

```kotlin
@Test
fun `my test`() {
    Story.given("something") // No context — steps are lost
}
```

Correct:

```kotlin
@Test
fun `my test`() {
    Story.init("My scenario")
    Story.given("something")
}
```

`Story.init()` creates the ThreadLocal context. Without it, step calls have no effect.

Source: packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/Story.kt

### HIGH Forgetting backticks on `when`

Wrong:

```kotlin
Story.when("something") // Compile error: 'when' is a Kotlin keyword
```

Correct:

```kotlin
Story.`when`("something")
```

In Kotlin, `when` is a reserved keyword. Use backtick-escaping or the alias `Story.execute()`.

Source: packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/Story.kt

### MEDIUM Not registering the TestExecutionListener

The listener is auto-discovered via JUnit 5's SPI (`META-INF/services/org.junit.platform.launcher.TestExecutionListener`). If you're using a custom launcher configuration that disables auto-discovery, register it manually:

```properties
# src/test/resources/META-INF/services/org.junit.platform.launcher.TestExecutionListener
dev.executablestories.junit5.StoryTestExecutionListener
```

Source: packages/executable-stories-junit5/src/main/kotlin/dev/executablestories/junit5/StoryTestExecutionListener.kt
