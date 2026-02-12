package dev.executablestories.junit5

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class IntegrationTest {

    @AfterEach
    fun tearDown() {
        Story.clear()
    }

    @Test
    fun fullStoryFlowDoesNotThrow() {
        Story.init("User completes a purchase", "e2e", "checkout")

        Story.note("Testing the happy path checkout flow")

        Story.given("a logged-in user with items in cart")
        Story.kv("userId", "user-123")
        Story.kv("cartItems", 3)

        Story.`when`("the user proceeds to checkout")
        Story.json("Checkout Payload", mapOf(
            "items" to 3,
            "total" to 99.99
        ))

        Story.and("enters payment information")
        Story.code("Card Token", "tok_visa_4242", "text")

        Story.then("the order is confirmed")
        Story.note("Order confirmation page is shown")
        Story.link("Order Page", "https://example.com/orders/12345")

        Story.and("a confirmation email is sent")
        Story.table(
            "Email Details",
            arrayOf("Field", "Value"),
            arrayOf(
                arrayOf("To", "user@example.com"),
                arrayOf("Subject", "Order Confirmed"),
                arrayOf("Template", "order-confirmation")
            )
        )

        Story.but("the inventory is not yet decremented")
        Story.mermaid(
            "sequenceDiagram\n  User->>Checkout: Submit\n  Checkout->>Payment: Charge\n  Payment-->>Checkout: OK",
            "Checkout Flow"
        )
        Story.screenshot("/tmp/order-confirmation.png", "Order confirmation page")
        Story.custom("timing", mapOf("checkoutMs" to 450))

        val ctx = Story.getContext()!!
        assertNotNull(ctx)
        assertEquals("User completes a purchase", ctx.scenario)
        assertEquals(6, ctx.steps.size)
        assertEquals(1, ctx.docs.size) // Story-level note

        val meta = ctx.toStoryMeta()
        assertNotNull(meta)
        assertEquals("User completes a purchase", meta.scenario)
        assertEquals(6, meta.steps!!.size)
    }

    @Test
    fun minimalStoryDoesNotThrow() {
        Story.init("Minimal scenario")
        Story.given("something")
        Story.then("something happens")

        assertNotNull(Story.getContext())
        assertEquals(2, Story.getContext()!!.steps.size)
    }

    @Test
    fun storyWithOnlyInitDoesNotThrow() {
        Story.init("Just init, no steps")

        val ctx = Story.getContext()!!
        assertNotNull(ctx)
        assertEquals("Just init, no steps", ctx.scenario)
        assertTrue(ctx.steps.isEmpty())
    }
}
