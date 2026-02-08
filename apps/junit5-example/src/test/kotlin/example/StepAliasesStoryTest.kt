package example

import dev.executablestories.junit5.Story
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue

class StepAliasesStoryTest {

    @Test
    fun explicitAndAndButSteps() {
        Story.init("Order with explicit And and But steps")
        Story.given("the user is logged in")
        Story.and("the user has a valid payment method")
        Story.and("the user has items in cart")
        Story.`when`("the user clicks checkout")
        Story.and("confirms the order")
        Story.then("the order should be created")
        Story.and("the payment should be processed")
        Story.but("the inventory is not yet decremented")
        assertTrue(true)
    }

    @Test
    fun butForNegativeAssertion() {
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
    fun mixedGivenWhenThenWithAnd() {
        Story.init("Sum calculation using and")
        Story.given("numbers 1, 2, 3, 4, 5")
        Story.and("an accumulator initialized to zero")
        val sum = 1 + 2 + 3 + 4 + 5
        Story.`when`("the sum is calculated")
        Story.then("the result is 15")
        Story.and("the result is positive")
        assertEquals(15, sum)
        assertTrue(sum > 0)
    }
}
