package dev.executablestories.junit5

import org.junit.platform.engine.TestExecutionResult
import org.junit.platform.launcher.TestExecutionListener
import org.junit.platform.launcher.TestIdentifier
import org.junit.platform.launcher.TestPlan
import java.io.PrintWriter
import java.io.StringWriter
import java.nio.file.Path
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Published raw-run schema, emitted as `$schema` so editors validate the output
 * file as the adapter writes it.
 */
private const val SCHEMA_URL = "https://executable-stories.dev/schemas/raw-run.schema.json"

class StoryTestExecutionListener : TestExecutionListener {
    private var startedAtMs: Long = 0
    private val testCases: MutableList<Map<String, Any?>> = CopyOnWriteArrayList()
    private val testStartTimes: ConcurrentHashMap<String, Long> = ConcurrentHashMap()

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
        if (!testIdentifier.isTest) return

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

    override fun testPlanExecutionFinished(testPlan: TestPlan) {
        if (testCases.isEmpty()) return

        val finishedAtMs = System.currentTimeMillis()

        val rawRun = LinkedHashMap<String, Any?>()
        // $schema first so editors pick it up and validate the file as it is
        // written; `executable-stories doctor` also reports its presence.
        rawRun["\$schema"] = SCHEMA_URL
        rawRun["schemaVersion"] = 1
        rawRun["testCases"] = ArrayList(testCases)
        val features = Story.declaredFeatures()
        if (features.isNotEmpty()) {
            rawRun["features"] = features
        }
        rawRun["startedAtMs"] = startedAtMs
        rawRun["finishedAtMs"] = finishedAtMs
        rawRun["projectRoot"] = System.getProperty("user.dir")

        val ci = detectCI()
        if (ci != null) {
            rawRun["ci"] = ci
        }

        val outputEnv = System.getenv("EXECUTABLE_STORIES_OUTPUT")
        val outputPath =
            if (!outputEnv.isNullOrBlank()) {
                Path.of(outputEnv)
            } else {
                Path.of(System.getProperty("user.dir"), ".executable-stories", "raw-run.json")
            }

        try {
            RawRunWriter.writeRawRun(rawRun, outputPath)
            printNextStep(outputPath)
        } catch (e: java.io.IOException) {
            System.err.println("[executable-stories] Failed to write raw-run.json: ${e.message}")
            e.printStackTrace(System.err)
        }

        testCases.clear()
    }

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
