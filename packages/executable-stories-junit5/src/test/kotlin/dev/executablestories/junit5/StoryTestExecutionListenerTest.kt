package dev.executablestories.junit5

import org.junit.jupiter.api.Test
import org.junit.platform.engine.TestExecutionResult
import org.junit.jupiter.api.Assertions.assertEquals

class StoryTestExecutionListenerTest {

    @Test
    fun statusMappingUsesSchemaValues() {
        val method = StoryTestExecutionListener::class.java.getDeclaredMethod(
            "mapStatus",
            TestExecutionResult.Status::class.java
        )
        method.isAccessible = true

        assertEquals("pass", method.invoke(null, TestExecutionResult.Status.SUCCESSFUL))
        assertEquals("fail", method.invoke(null, TestExecutionResult.Status.FAILED))
        assertEquals("skip", method.invoke(null, TestExecutionResult.Status.ABORTED))
    }
}
