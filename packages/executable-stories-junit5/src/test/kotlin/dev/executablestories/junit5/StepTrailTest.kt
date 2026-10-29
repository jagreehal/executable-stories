package dev.executablestories.junit5

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

/**
 * The step checklist the listener prints for a failed test, so a red run shows
 * how far the story got without opening the report.
 */
class StepTrailTest {
    @AfterEach
    fun clear() = Story.clear()

    private fun trail(vararg lines: String) = "Story steps:\n" + lines.joinToString("\n")

    private fun current() = Story.getContext()!!.stepTrail()

    @Test
    fun marksTheLastMarker() {
        Story.init("marker")
        Story.given("a balance of 50")
        Story.then("the balance is 150")
        assertEquals(trail("  ✓ Given a balance of 50", "  ✗ Then the balance is 150"), current())
    }

    @Test
    fun marksTheWrappedStepThatThrew() {
        Story.init("wrapped")
        Story.given("setup")
        assertThrows<IllegalStateException> { Story.fn("When", "it breaks", Runnable { error("kaput") }) }
        assertEquals(trail("  ✓ Given setup", "  ✗ When it breaks"), current())
    }

    @Test
    fun failureAfterAFinishedWrappedStep() {
        Story.init("after")
        Story.fn("Given", "setup", Runnable {})
        assertEquals(trail("  ✓ Given setup", "  ✗ (failed after the last step)"), current())
    }

    @Test
    fun aCaughtThrowDoesNotOwnALaterFailure() {
        Story.init("caught")
        assertThrows<IllegalStateException> { Story.fn("Given", "a rejected input", Runnable { error("rejected") }) }
        Story.then("the total is 3")
        assertEquals(trail("  ✓ Given a rejected input", "  ✗ Then the total is 3"), current())
    }

    @Test
    fun nestedStepsMarkTheInnerOne() {
        Story.init("nested")
        assertThrows<IllegalStateException> {
            Story.fn(
                "When",
                "the order is placed",
                Runnable { Story.fn("And", "payment is taken", Runnable { error("declined") }) },
            )
        }
        assertEquals(trail("  ✓ When the order is placed", "  ✗ And payment is taken"), current())
    }
}
