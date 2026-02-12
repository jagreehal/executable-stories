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

    override fun executionFinished(testIdentifier: TestIdentifier, testExecutionResult: TestExecutionResult) {
        if (!testIdentifier.isTest) return

        val context = Story.getContext()
        val status = mapStatus(testExecutionResult.status)

        val testCase = LinkedHashMap<String, Any?>()
        testCase["title"] = testIdentifier.displayName
        testCase["status"] = status
        testCase["externalId"] = testIdentifier.uniqueId

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

    override fun testPlanExecutionFinished(testPlan: TestPlan) {
        if (testCases.isEmpty()) return

        val finishedAtMs = System.currentTimeMillis()

        val rawRun = LinkedHashMap<String, Any?>()
        rawRun["schemaVersion"] = 1
        rawRun["testCases"] = ArrayList(testCases)
        rawRun["startedAtMs"] = startedAtMs
        rawRun["finishedAtMs"] = finishedAtMs
        rawRun["projectRoot"] = System.getProperty("user.dir")

        val ci = detectCI()
        if (ci != null) {
            rawRun["ci"] = ci
        }

        val outputEnv = System.getenv("EXECUTABLE_STORIES_OUTPUT")
        val outputPath = if (!outputEnv.isNullOrBlank()) {
            Path.of(outputEnv)
        } else {
            Path.of(System.getProperty("user.dir"), ".executable-stories", "raw-run.json")
        }

        try {
            RawRunWriter.writeRawRun(rawRun, outputPath)
        } catch (e: java.io.IOException) {
            System.err.println("[executable-stories] Failed to write raw-run.json: ${e.message}")
            e.printStackTrace(System.err)
        }

        testCases.clear()
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
        @JvmStatic
        private fun mapStatus(status: TestExecutionResult.Status): String = when (status) {
            TestExecutionResult.Status.SUCCESSFUL -> "pass"
            TestExecutionResult.Status.FAILED -> "fail"
            TestExecutionResult.Status.ABORTED -> "skip"
        }
    }
}
