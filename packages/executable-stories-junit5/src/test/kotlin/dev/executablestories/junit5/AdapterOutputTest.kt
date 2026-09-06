package dev.executablestories.junit5

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.junit.platform.engine.TestDescriptor
import org.junit.platform.engine.TestExecutionResult
import org.junit.platform.engine.UniqueId
import org.junit.platform.engine.support.descriptor.AbstractTestDescriptor
import org.junit.platform.engine.support.descriptor.ClassSource
import org.junit.platform.launcher.TestIdentifier
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeSource

/**
 * Covers what the adapter puts in the run file, and how it gets there.
 */
class AdapterOutputTest {
    @AfterEach
    fun tearDown() {
        Story.clear()
    }

    @Test
    fun videoIsAvailableAsADocKind() {
        Story.init("a recorded journey")
        Story.given("a browser session")
        Story.video("run.webm", "Checkout", "poster.png")

        val json = RawRunWriter.getMapper().writeValueAsString(Story.getContext()!!.toStoryMeta())

        assertTrue(json.contains("\"kind\" : \"video\""), json)
        assertTrue(json.contains("\"path\" : \"run.webm\""), json)
        assertTrue(json.contains("\"caption\" : \"Checkout\""), json)
        assertTrue(json.contains("\"poster\" : \"poster.png\""), json)
    }

    // Removing the last story from a class that still has ordinary tests is
    // exactly what coveredSourceFiles reports, so the run is still written.
    @Test
    fun aRunThatReachedClassesButToldNoStoryIsStillBuilt(
        @TempDir dir: Path,
    ) {
        val run =
            StoryTestExecutionListener().buildRawRun(
                emptyList(),
                ClassInventory(listOf("example.CheckoutTest"), emptyList()),
                1L,
                2L,
                dir.toString(),
            )

        assertNotNull(run)
        assertEquals(emptyList<Map<String, Any?>>(), run!!["testCases"])
        assertEquals(listOf("example.CheckoutTest"), run["coveredSourceFiles"])
    }

    @Test
    fun aTestPlanThatReachedNothingBuildsNoRun(
        @TempDir dir: Path,
    ) {
        assertNull(
            StoryTestExecutionListener().buildRawRun(
                emptyList(),
                ClassInventory(emptyList(), emptyList()),
                1L,
                2L,
                dir.toString(),
            ),
        )
    }

    // A @TestFactory that produced no tests, or a class whose tests were all
    // removed, executes without a leaf ever finishing — the run whose inventory
    // most needs to name the class.
    @Test
    fun aSuccessfulContainerWithNoTestsStillReachesTheInventory() {
        val listener = StoryTestExecutionListener()

        listener.executionFinished(container("example.EmptyFactoryTest"), TestExecutionResult.successful())

        assertEquals(listOf("example.EmptyFactoryTest"), listener.inventory().covered)
    }

    // A container that failed never got to its tests, so it cannot vouch for
    // them. JUnit still reports the enclosing class as successful, so leaving it
    // out of the covered list is not enough: without the incomplete list a
    // full-scope run reads as authoritative and deletes what the class used to
    // report.
    @Test
    fun aFailedContainerMarksItsClassIncomplete() {
        val listener = StoryTestExecutionListener()

        listener.executionFinished(
            container("example.BrokenFactoryTest"),
            TestExecutionResult.failed(IllegalStateException("@TestFactory threw")),
        )
        // The enclosing class comes back successful all the same.
        listener.executionFinished(container("example.BrokenFactoryTest"), TestExecutionResult.successful())

        val inventory = listener.inventory()
        assertEquals(listOf("example.BrokenFactoryTest"), inventory.covered)
        assertEquals(listOf("example.BrokenFactoryTest"), inventory.incomplete)
    }

    // A skipped container never reaches executionFinished at all, so a disabled
    // @TestFactory would otherwise leave only the enclosing class's successful
    // result behind — a full-scope run reading as authoritative over scenarios
    // nobody chose to delete.
    @Test
    fun aSkippedContainerMarksItsClassIncomplete() {
        val listener = StoryTestExecutionListener()

        listener.executionSkipped(container("example.DisabledFactoryTest"), "@DisabledIfSystemProperty")
        listener.executionFinished(container("example.DisabledFactoryTest"), TestExecutionResult.successful())

        assertEquals(listOf("example.DisabledFactoryTest"), listener.inventory().incomplete)
    }

    // A switched-off test cannot report itself: scenario identity comes from the
    // title its body passes to Story.init, and a body that never ran has none to
    // give. Marking the class keeps what the test last documented, where a
    // stand-in built from the method name would arrive beside it as a second
    // scenario.
    @Test
    fun aSkippedTestMarksItsClassIncomplete() {
        val listener = StoryTestExecutionListener()

        listener.executionSkipped(leaf("example.CheckoutTest", "checkout()"), "@Disabled")

        assertEquals(listOf("example.CheckoutTest"), listener.inventory().incomplete)
        assertNull(listener.inventory().covered.firstOrNull())
    }

    // The class's own container still comes back successful, so the covered list
    // alone would let a full-scope run retire the scenario.
    @Test
    fun aClassWhoseOnlyTestIsSkippedIsNotAuthoritative() {
        val listener = StoryTestExecutionListener()

        listener.executionSkipped(leaf("example.CheckoutTest", "checkout()"), "@Disabled")
        listener.executionFinished(container("example.CheckoutTest"), TestExecutionResult.successful())

        val inventory = listener.inventory()
        assertEquals(listOf("example.CheckoutTest"), inventory.covered)
        assertEquals(listOf("example.CheckoutTest"), inventory.incomplete)
    }

    @Test
    fun anIncompleteClassReachesTheRun(
        @TempDir dir: Path,
    ) {
        val run =
            StoryTestExecutionListener().buildRawRun(
                emptyList(),
                ClassInventory(listOf("example.BrokenFactoryTest"), listOf("example.BrokenFactoryTest")),
                1L,
                2L,
                dir.toString(),
            )

        assertEquals(listOf("example.BrokenFactoryTest"), run!!["incompleteSourceFiles"])
    }

    @Test
    fun anAbortedContainerCountsAsIncompleteToo() {
        val listener = StoryTestExecutionListener()

        listener.executionFinished(
            container("example.SkippedFactoryTest"),
            TestExecutionResult.aborted(null),
        )

        assertEquals(listOf("example.SkippedFactoryTest"), listener.inventory().incomplete)
        assertEquals(emptyList<String>(), listener.inventory().covered)
    }

    // Reading the process to EOF first hands the timeout to the process rather
    // than the other way round, so a hung command holds up the whole run.
    @Test
    fun aCommandThatOutrunsItsTimeoutIsGivenUpOn() {
        val process = ProcessBuilder("sleep", "30").start()
        val clock = TimeSource.Monotonic.markNow()

        val output = readCommandOutput(process, 1L)

        assertNull(output)
        assertTrue(clock.elapsedNow() < 10.seconds, "waited ${clock.elapsedNow()}")
        // destroyForcibly only asks; a sleep still running after this was never killed.
        assertTrue(process.waitFor(5, TimeUnit.SECONDS), "the timed-out process was left running")
    }

    @Test
    fun aCommandThatFailsReportsNothing() {
        val process = ProcessBuilder("sh", "-c", "echo out; exit 3").start()

        assertNull(readCommandOutput(process, 5L))
    }

    @Test
    fun aCommandThatSucceedsReportsItsOutput() {
        val process = ProcessBuilder("sh", "-c", "echo deadbeef").start()

        assertEquals("deadbeef", readCommandOutput(process, 5L))
    }

    private fun container(className: String): TestIdentifier =
        identifier(className, TestDescriptor.Type.CONTAINER, className.substringAfterLast('.'))

    private fun leaf(
        className: String,
        displayName: String,
    ): TestIdentifier = identifier(className, TestDescriptor.Type.TEST, displayName)

    private fun identifier(
        className: String,
        kind: TestDescriptor.Type,
        displayName: String,
    ): TestIdentifier =
        TestIdentifier.from(
            object : AbstractTestDescriptor(
                UniqueId.forEngine("adapter-output").append("class", className).append("name", displayName),
                displayName,
                ClassSource.from(className),
            ) {
                override fun getType(): TestDescriptor.Type = kind
            },
        )

    // A write that fails leaves the last good report in place, and a reader
    // polling the file mid-run always parses it.
    @Test
    fun aFailedWriteLeavesThePreviousReportIntact(
        @TempDir dir: Path,
    ) {
        val output = dir.resolve("raw-run.json")
        RawRunWriter.writeRawRun(mapOf("projectRoot" to "first"), output)

        // Jackson cannot serialize a self-referencing structure.
        val cycle = mutableMapOf<String, Any?>("projectRoot" to "second")
        cycle["self"] = cycle
        assertThrows(Exception::class.java) { RawRunWriter.writeRawRun(cycle, output) }

        val back = RawRunWriter.getMapper().readTree(output.toFile())
        assertEquals("first", back["projectRoot"].asText())

        val strays = Files.list(dir).use { paths -> paths.map { it.fileName.toString() }.toList() }
        assertEquals(listOf("raw-run.json"), strays)
    }

    @Test
    fun theRunFileIsReplacedRatherThanTruncated(
        @TempDir dir: Path,
    ) {
        val output = dir.resolve("raw-run.json")
        RawRunWriter.writeRawRun(mapOf("projectRoot" to "first"), output)
        RawRunWriter.writeRawRun(mapOf("projectRoot" to "second"), output)

        assertEquals("second", RawRunWriter.getMapper().readTree(output.toFile())["projectRoot"].asText())
        assertFalse(Files.list(dir).use { it.anyMatch { path -> path.fileName.toString().endsWith(".tmp") } })
    }
}
