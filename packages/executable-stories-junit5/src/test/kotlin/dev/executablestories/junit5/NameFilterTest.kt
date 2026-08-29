package dev.executablestories.junit5

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * A run narrowed by test name reports only the matching tests, so it is not the
 * complete contents of the classes it touches.
 *
 * The JUnit Platform hides discovery filters from execution listeners, so unlike
 * the Vitest, Jest and Playwright adapters this cannot be read off a config
 * object. What can be seen is Maven Surefire's `-Dtest=` and an explicit
 * EXECUTABLE_STORIES_FILTERED; anything else leaves the scope unknown, which
 * keeps data rather than removing it.
 */
class NameFilterTest {
    @Test
    fun `a run with no signal at all has unknown scope`() {
        // Gradle --tests and IDE run configurations are invisible here, so
        // claiming full coverage would be a guess that could delete scenarios.
        assertNull(runScope(testProperty = null, filteredEnv = null))
    }

    @Test
    fun `blank values say nothing`() {
        assertNull(runScope(testProperty = "  ", filteredEnv = ""))
    }

    @Test
    fun `maven test property means the run was narrowed`() {
        assertEquals("filtered", runScope(testProperty = "PaymentTest#refuses*", filteredEnv = null))
    }

    @Test
    fun `environment override states a narrowed run`() {
        assertEquals("filtered", runScope(testProperty = null, filteredEnv = "1"))
    }

    @Test
    fun `environment override can state a complete run`() {
        assertEquals("full", runScope(testProperty = null, filteredEnv = "0"))
        assertEquals("full", runScope(testProperty = null, filteredEnv = "false"))
    }
}
