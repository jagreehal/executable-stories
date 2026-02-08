package example

import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertTrue

class GherkinPatternsStoryTest {

    @Test
    fun multipleGivenAutoAnd() {
        Story.init("User logs in successfully")
        Story.given("the user account exists")
        Story.given("the user is on the login page")
        Story.given("the account is active")
        Story.`when`("the user submits valid credentials")
        Story.then("the user should see the dashboard")
        assertTrue(true)
    }

    @Test
    fun multipleWhenAutoAnd() {
        Story.init("User updates profile settings")
        Story.given("the user is logged in")
        Story.`when`("the user navigates to settings")
        Story.`when`("the user changes their display name")
        Story.then("the changes should be saved")
        assertTrue(true)
    }

    @Test
    fun multipleThenAutoAnd() {
        Story.init("Successful order confirmation")
        Story.given("the user has items in cart")
        Story.`when`("the user completes checkout")
        Story.then("the order should be created")
        Story.then("a confirmation email should be sent")
        Story.then("the inventory should be updated")
        assertTrue(true)
    }

    @Test
    fun butKeywordForContrast() {
        Story.init("Login blocked for suspended user")
        Story.given("the user account exists")
        Story.given("the account is suspended")
        Story.`when`("the user submits valid credentials")
        Story.then("the user should see an error message")
        Story.but("the user should not be logged in")
        Story.but("the session should not be created")
        assertTrue(true)
    }

    @Test
    fun explicitAndSteps() {
        Story.init("Order with explicit And steps")
        Story.given("the user is logged in")
        Story.and("the user has a valid payment method")
        Story.and("the user has items in cart")
        Story.`when`("the user clicks checkout")
        Story.and("confirms the order")
        Story.then("the order should be created")
        Story.and("the payment should be processed")
        assertTrue(true)
    }
}
