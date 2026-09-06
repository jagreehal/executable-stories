package dev.executablestories.junit5

import org.junit.platform.engine.TestExecutionResult
import org.junit.platform.launcher.TestExecutionListener
import org.junit.platform.launcher.TestIdentifier
import org.junit.platform.launcher.TestPlan
import java.io.File
import java.io.IOException
import java.io.PrintWriter
import java.io.StringWriter
import java.nio.file.Path
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit

/**
 * Published raw-run schema, emitted as `$schema` so editors validate the output
 * file as the adapter writes it.
 */
private const val SCHEMA_URL = "https://executable-stories.dev/schemas/raw-run.schema.json"

private const val GIT_TIMEOUT_SECONDS = 5L

/**
 * Tell the user how to turn the run JSON into a report.
 *
 * The JS adapters render reports in-process, so their users never need to
 * know the CLI exists. JUnit hands off to the CLI instead, so without this
 * the run ends with a file and no indication of what to do with it. stderr
 * keeps piped output clean; EXECUTABLE_STORIES_QUIET silences it in CI.
 */
private fun printNextStep(outputPath: Path) {
    if (!System.getenv("EXECUTABLE_STORIES_QUIET").isNullOrBlank()) return
    System.err.println("\n[executable-stories] wrote $outputPath")
    System.err.println("  next: executable-stories format $outputPath --format html")
}

/**
 * Fully qualified class the test method belongs to, when JUnit reports one.
 */
private fun declaringClassName(testIdentifier: TestIdentifier): String? {
    val source = testIdentifier.source.orElse(null) ?: return null
    return when (source) {
        is org.junit.platform.engine.support.descriptor.MethodSource -> source.className
        is org.junit.platform.engine.support.descriptor.ClassSource -> source.className
        else -> null
    }
}

/**
 * Which classes a run reached, and which of them cannot speak for themselves.
 *
 * They travel together everywhere: a class is only safe to retire scenarios from
 * when the run both reached it and collected it in full.
 */
internal data class ClassInventory(
    val covered: List<String>,
    val incomplete: List<String>,
)

/**
 * Commit the report describes, or null when that cannot be established.
 *
 * CI hands the SHA over directly and is checked first, since a shallow or
 * detached checkout can make git the less reliable of the two. Git resolves HEAD
 * and packed-refs correctly, so shelling out to it beats reimplementing that here.
 */
private fun gitSha(workingDirectory: String): String? {
    for (key in listOf("GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA")) {
        val sha = System.getenv(key)
        if (!sha.isNullOrBlank()) return sha.trim()
    }

    return try {
        val process =
            ProcessBuilder("git", "rev-parse", "HEAD")
                .directory(File(workingDirectory))
                // Nothing reads stderr, and an unread pipe that fills is a
                // process that never exits.
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .start()
        readCommandOutput(process, GIT_TIMEOUT_SECONDS)
    } catch (_: IOException) {
        // No git on PATH, or not a repository. The field is optional.
        null
    }
}

/**
 * What [process] wrote to stdout, or null if it failed or outran [timeoutSeconds].
 *
 * The wait comes first: reading to EOF before it hands the timeout to the process
 * rather than the other way round. Reading afterwards is safe for output this
 * small, which the pipe buffers long before anyone asks.
 */
internal fun readCommandOutput(
    process: Process,
    timeoutSeconds: Long,
): String? {
    val finished =
        try {
            process.waitFor(timeoutSeconds, TimeUnit.SECONDS)
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
            false
        }

    if (!finished) {
        process.destroyForcibly()
        return null
    }

    val output =
        if (process.exitValue() == 0) {
            process.inputStream
                .bufferedReader()
                .readText()
                .trim()
        } else {
            ""
        }
    return output.ifEmpty { null }
}

class StoryTestExecutionListener : TestExecutionListener {
    private var startedAtMs: Long = 0
    private val testCases: MutableList<Map<String, Any?>> = CopyOnWriteArrayList()
    private val testStartTimes: ConcurrentHashMap<String, Long> = ConcurrentHashMap()

    /**
     * Classes this run executed, whether or not they told a story.
     *
     * Test cases only name the classes that produced something, so without this
     * a class emptied of scenarios looks exactly like one that did not run.
     */
    private val coveredClasses: MutableSet<String> = Collections.synchronizedSet(sortedSetOf())

    /**
     * Classes whose scenarios this run cannot account for.
     *
     * JUnit reports an enclosing class as successful even when something inside
     * it failed or was skipped, so without this the class reads as authoritative
     * over scenarios the run never saw.
     */
    private val incompleteClasses: MutableSet<String> = Collections.synchronizedSet(sortedSetOf())

    override fun testPlanExecutionStarted(testPlan: TestPlan) {
        startedAtMs = System.currentTimeMillis()
    }

    override fun executionStarted(testIdentifier: TestIdentifier) {
        if (testIdentifier.isTest) {
            testStartTimes[testIdentifier.uniqueId] = System.nanoTime()
        }
    }

    override fun executionFinished(
        testIdentifier: TestIdentifier,
        testExecutionResult: TestExecutionResult,
    ) {
        if (!testIdentifier.isTest) {
            recordContainer(testIdentifier, testExecutionResult.status == TestExecutionResult.Status.SUCCESSFUL)
            return
        }

        val context = Story.getContext()
        val status = resolveStatus(context?.planned == true, testExecutionResult.status)

        val testCase = LinkedHashMap<String, Any?>()
        testCase["title"] = testIdentifier.displayName
        testCase["status"] = status
        testCase["externalId"] = testIdentifier.uniqueId

        // The JVM does not hand us a source path, so the declaring class is the
        // stable key the report groups by, and the one story.feature() records
        // against. Without it every scenario lands under a single "unknown".
        val className = declaringClassName(testIdentifier)
        if (className != null) {
            coveredClasses.add(className)
            testCase["sourceFile"] = className
            testCase["titlePath"] = listOf(className.substringAfterLast('.'), testIdentifier.displayName)
        }

        val startNanos = testStartTimes.remove(testIdentifier.uniqueId)
        if (startNanos != null) {
            val durationMs = (System.nanoTime() - startNanos) / 1_000_000.0
            testCase["durationMs"] = durationMs
        }

        testExecutionResult.throwable.ifPresent { throwable ->
            val error = LinkedHashMap<String, Any?>()
            error["message"] = throwable.message
            if (throwable.stackTrace != null) {
                val sw = StringWriter()
                throwable.printStackTrace(PrintWriter(sw))
                error["stack"] = sw.toString()
            }
            testCase["error"] = error
        }

        testCase["retry"] = 0
        testCase["retries"] = 0

        if (context != null) {
            testCase["story"] = context.toStoryMeta()
            if (context.getAttachments().isNotEmpty()) {
                testCase["attachments"] = ArrayList(context.getAttachments())
            }
            val stepEvents = mutableListOf<Map<String, Any?>>()
            context.steps.forEachIndexed { i, step ->
                if (step.durationMs != null) {
                    val event = LinkedHashMap<String, Any?>()
                    event["index"] = i
                    event["title"] = step.text
                    event["durationMs"] = step.durationMs
                    stepEvents.add(event)
                }
            }
            if (stepEvents.isNotEmpty()) {
                testCase["stepEvents"] = stepEvents
            }
        }

        testCases.add(testCase)
        Story.clear()
    }

    /**
     * Put a container in the inventory, on the side its outcome earns it.
     *
     * A container counts as reached: a `@TestFactory` that produced no tests
     * executes without a leaf ever finishing, and that is the run whose
     * inventory most has to name the class. One that did not succeed never got
     * to its tests and cannot vouch for them.
     */
    private fun recordContainer(
        testIdentifier: TestIdentifier,
        succeeded: Boolean,
    ) {
        val className = declaringClassName(testIdentifier) ?: return
        if (succeeded) {
            coveredClasses.add(className)
        } else {
            incompleteClasses.add(className)
        }
    }

    /**
     * Copy of the class inventory so far. Tests only.
     */
    internal fun inventory(): ClassInventory =
        ClassInventory(
            synchronized(coveredClasses) { ArrayList(coveredClasses) },
            synchronized(incompleteClasses) { ArrayList(incompleteClasses) },
        )

    override fun executionSkipped(
        testIdentifier: TestIdentifier,
        reason: String,
    ) {
        // Skipping never reaches executionFinished, so the class can no longer
        // speak for its own contents. A skipped test cannot report itself
        // instead: scenario identity comes from the title the body passes to
        // Story.init, and a body that never ran has none to give.
        declaringClassName(testIdentifier)?.let { incompleteClasses.add(it) }
    }

    override fun testPlanExecutionFinished(testPlan: TestPlan) {
        val projectRoot = System.getProperty("user.dir")
        val rawRun =
            buildRawRun(
                ArrayList(testCases),
                inventory(),
                startedAtMs,
                System.currentTimeMillis(),
                projectRoot,
            ) ?: return

        val outputEnv = System.getenv("EXECUTABLE_STORIES_OUTPUT")
        val outputPath =
            if (!outputEnv.isNullOrBlank()) {
                Path.of(outputEnv)
            } else {
                Path.of(projectRoot, ".executable-stories", "raw-run.json")
            }

        try {
            RawRunWriter.writeRawRun(rawRun, outputPath)
            printNextStep(outputPath)
        } catch (e: IOException) {
            System.err.println("[executable-stories] Failed to write raw-run.json: ${e.message}")
            e.printStackTrace(System.err)
        }

        testCases.clear()
        coveredClasses.clear()
        incompleteClasses.clear()
    }

    /**
     * The run to write, or null when this test plan has nothing to report.
     *
     * A run that reached classes but produced no scenario is still worth
     * writing: removing the last story from a class while its ordinary tests
     * stay put is exactly the case `coveredSourceFiles` exists to report, and
     * skipping the write leaves the deleted scenarios in the docs however
     * complete the run declares itself to be.
     */
    internal fun buildRawRun(
        testCases: List<Map<String, Any?>>,
        inventory: ClassInventory,
        startedAtMs: Long,
        finishedAtMs: Long,
        projectRoot: String,
    ): Map<String, Any?>? {
        if (testCases.isEmpty() && inventory.covered.isEmpty() && inventory.incomplete.isEmpty()) return null

        val rawRun = LinkedHashMap<String, Any?>()
        // $schema first so editors pick it up and validate the file as it is
        // written; `executable-stories doctor` also reports its presence.
        rawRun["\$schema"] = SCHEMA_URL
        rawRun["schemaVersion"] = 1
        rawRun["testCases"] = testCases
        val features = Story.declaredFeatures()
        if (features.isNotEmpty()) {
            rawRun["features"] = features
        }
        if (inventory.covered.isNotEmpty()) {
            rawRun["coveredSourceFiles"] = inventory.covered
        }
        if (inventory.incomplete.isNotEmpty()) {
            rawRun["incompleteSourceFiles"] = inventory.incomplete
        }
        rawRun["startedAtMs"] = startedAtMs
        rawRun["finishedAtMs"] = finishedAtMs
        rawRun["projectRoot"] = projectRoot
        gitSha(projectRoot)?.let { rawRun["gitSha"] = it }

        detectCI()?.let { rawRun["ci"] = it }

        // Absent means neither signal said anything; consumers then keep what
        // this run did not report rather than retiring it on a guess.
        runScope(System.getProperty("test"), System.getenv("EXECUTABLE_STORIES_FILTERED"))
            ?.let { rawRun["runScope"] = it }

        return rawRun
    }

    private fun detectCI(): Map<String, Any?>? {
        if ("true" == System.getenv("GITHUB_ACTIONS")) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "github"
            System.getenv("GITHUB_RUN_NUMBER")?.let { ci["buildNumber"] = it }
            val server = System.getenv("GITHUB_SERVER_URL")
            val repo = System.getenv("GITHUB_REPOSITORY")
            val runId = System.getenv("GITHUB_RUN_ID")
            if (server != null && repo != null && runId != null) {
                ci["url"] = "$server/$repo/actions/runs/$runId"
            }
            return ci
        }
        if ("true" == System.getenv("CIRCLECI")) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "circleci"
            System.getenv("CIRCLE_BUILD_NUM")?.let { ci["buildNumber"] = it }
            System.getenv("CIRCLE_BUILD_URL")?.let { ci["url"] = it }
            return ci
        }
        if (System.getenv("JENKINS_URL") != null) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "jenkins"
            System.getenv("BUILD_NUMBER")?.let { ci["buildNumber"] = it }
            System.getenv("BUILD_URL")?.let { ci["url"] = it }
            return ci
        }
        if ("true" == System.getenv("TRAVIS")) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "travis"
            System.getenv("TRAVIS_BUILD_NUMBER")?.let { ci["buildNumber"] = it }
            System.getenv("TRAVIS_BUILD_WEB_URL")?.let { ci["url"] = it }
            return ci
        }
        if ("true" == System.getenv("GITLAB_CI")) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "gitlab"
            System.getenv("CI_PIPELINE_IID")?.let { ci["buildNumber"] = it }
            System.getenv("CI_PIPELINE_URL")?.let { ci["url"] = it }
            return ci
        }
        if ("true" == System.getenv("CI")) {
            val ci = LinkedHashMap<String, Any?>()
            ci["name"] = "ci"
            return ci
        }
        return null
    }

    companion object {
        /**
         * A planned declaration only counts when the test itself came out clean.
         * Code after [Story.planned] can still fail or abort, and reporting that
         * as "planned" would hide a broken test behind a plan.
         */
        @JvmStatic
        private fun resolveStatus(
            planned: Boolean,
            status: TestExecutionResult.Status,
        ): String =
            if (planned && status == TestExecutionResult.Status.SUCCESSFUL) {
                "todo"
            } else {
                mapStatus(status)
            }

        @JvmStatic
        private fun mapStatus(status: TestExecutionResult.Status): String =
            when (status) {
                TestExecutionResult.Status.SUCCESSFUL -> "pass"
                TestExecutionResult.Status.FAILED -> "fail"
                TestExecutionResult.Status.ABORTED -> "skip"
            }
    }
}
