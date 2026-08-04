package dev.executablestories.junit5

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.platform.engine.TestExecutionResult

class StoryTestExecutionListenerTest {
    @Test
    fun statusMappingUsesSchemaValues() {
        val method =
            StoryTestExecutionListener::class.java.getDeclaredMethod(
                "mapStatus",
                TestExecutionResult.Status::class.java,
            )
        method.isAccessible = true

        assertEquals("pass", method.invoke(null, TestExecutionResult.Status.SUCCESSFUL))
        assertEquals("fail", method.invoke(null, TestExecutionResult.Status.FAILED))
        assertEquals("skip", method.invoke(null, TestExecutionResult.Status.ABORTED))
    }

    @Test
    fun plannedOnlyWinsWhenTheTestItselfPassed() {
        val method =
            StoryTestExecutionListener::class.java.getDeclaredMethod(
                "resolveStatus",
                Boolean::class.java,
                TestExecutionResult.Status::class.java,
            )
        method.isAccessible = true

        assertEquals("todo", method.invoke(null, true, TestExecutionResult.Status.SUCCESSFUL))
        // A failure after Story.planned() must stay a failure.
        assertEquals("fail", method.invoke(null, true, TestExecutionResult.Status.FAILED))
        assertEquals("skip", method.invoke(null, true, TestExecutionResult.Status.ABORTED))
        assertEquals("pass", method.invoke(null, false, TestExecutionResult.Status.SUCCESSFUL))
    }
}
