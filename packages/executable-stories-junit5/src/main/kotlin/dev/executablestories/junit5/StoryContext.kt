package dev.executablestories.junit5

import java.util.concurrent.atomic.AtomicInteger

class StoryContext(
    val scenario: String,
) {
    private class TimerEntry(
        val startNanos: Long,
        val stepIndex: Int?,
        val stepId: String?,
        var consumed: Boolean = false,
    )

    val steps: MutableList<StoryStep> = mutableListOf()
    val tags: MutableList<String> = mutableListOf()
    val tickets: MutableList<Ticket> = mutableListOf()
    val covers: MutableList<String> = mutableListOf()
    val meta: MutableMap<String, Any?> = LinkedHashMap()
    val docs: MutableList<DocEntry> = mutableListOf()
    val sourceOrder: Int = ORDER_COUNTER.getAndIncrement()
    val startedAtMs: Long = System.currentTimeMillis()

    var traceUrlTemplate: String? = null

    /** Set by [Story.planned]: specified, not built yet. */
    var planned: Boolean = false

    var currentStep: StoryStep? = null
        private set

    /** The wrapped step whose body threw, until another step starts (the throw was caught). */
    internal var thrownStep: StoryStep? = null

    private val seenPrimaryKeywords: MutableSet<String> = mutableSetOf()
    private var stepCounter = 0
    private val attachments: MutableList<Map<String, Any?>> = mutableListOf()

    private val activeTimers: MutableMap<Int, TimerEntry> = mutableMapOf()
    private var timerCounter = 0
    var otelSpans: List<Any>? = null

    constructor(scenario: String, vararg tags: String) : this(scenario) {
        this.tags.addAll(tags.toList())
    }

    fun addStep(
        keyword: String,
        text: String,
    ) {
        addStep(keyword, text, null)
    }

    fun addStep(
        keyword: String,
        text: String,
        vararg docs: DocEntry?,
    ) {
        var effectiveKeyword = keyword
        if (isPrimary(keyword)) {
            if (!seenPrimaryKeywords.add(keyword)) {
                effectiveKeyword = "And"
            }
        }
        val step = StoryStep(effectiveKeyword, text)
        step.id = "step-${stepCounter++}"
        step.startedAtMs = System.currentTimeMillis()
        steps.add(step)
        currentStep = step
        thrownStep = null
        for (doc in docs) {
            if (doc != null) {
                step.addDoc(doc)
            }
        }
    }

    /**
     * The steps as a checklist for a failure, so a red test shows how far the
     * story got without opening the report. The failing step is the wrapped step
     * whose body threw, else the last step: a marker states a claim and the
     * assertion that broke follows it. When the last step is a wrapped body that
     * finished, the failure came after it. Empty with no steps.
     */
    fun stepTrail(): String {
        if (steps.isEmpty()) return ""
        val last = steps.last()
        val failed = thrownStep ?: last.takeIf { it.wrapped != true }
        val lines = steps.map { "  ${if (it === failed) "✗" else "✓"} ${it.keyword} ${it.text}" }.toMutableList()
        if (failed == null) lines.add("  ✗ (failed after the last step)")
        return "Story steps:\n" + lines.joinToString("\n")
    }

    fun addDoc(doc: DocEntry) {
        @Suppress("UNCHECKED_CAST")
        val children = doc["children"] as? List<DocEntry>
        if (!children.isNullOrEmpty()) {
            docs.removeAll(children.toSet())
            steps.forEach { step ->
                step.docs?.removeAll(children.toSet())
            }
        }
        val step = currentStep
        if (step != null) {
            step.addDoc(doc)
        } else {
            docs.add(doc)
        }
    }

    fun addAttachment(
        name: String,
        mediaType: String,
        path: String?,
        body: String?,
        encoding: String?,
        charset: String?,
        fileName: String?,
    ) {
        val a = LinkedHashMap<String, Any?>()
        a["name"] = name
        a["mediaType"] = mediaType
        if (path != null) a["path"] = path
        if (body != null) a["body"] = body
        if (encoding != null) a["encoding"] = encoding
        if (charset != null) a["charset"] = charset
        if (fileName != null) a["fileName"] = fileName
        val step = currentStep
        if (step != null) {
            a["stepIndex"] = steps.indexOf(step)
            a["stepId"] = step.id
        }
        attachments.add(a)
    }

    fun getAttachments(): List<Map<String, Any?>> = attachments

    fun toStoryMeta(): StoryMeta =
        StoryMeta().apply {
            scenario = this@StoryContext.scenario
            steps = if (this@StoryContext.steps.isEmpty()) null else ArrayList(this@StoryContext.steps)
            tags = if (this@StoryContext.tags.isEmpty()) null else ArrayList(this@StoryContext.tags)
            tickets = if (this@StoryContext.tickets.isEmpty()) null else ArrayList(this@StoryContext.tickets)
            covers = if (this@StoryContext.covers.isEmpty()) null else ArrayList(this@StoryContext.covers)
            meta = if (this@StoryContext.meta.isEmpty()) null else LinkedHashMap(this@StoryContext.meta)
            docs = if (this@StoryContext.docs.isEmpty()) null else ArrayList(this@StoryContext.docs)
            sourceOrder = this@StoryContext.sourceOrder
            otelSpans = this@StoryContext.otelSpans
            // A planned scenario never ran, so it has no start time.
            startedAtMs = if (planned) null else this@StoryContext.startedAtMs
        }

    fun startTimer(): Int {
        val token = timerCounter++
        val stepIndex = if (currentStep != null) steps.size - 1 else null
        val stepId = currentStep?.id
        activeTimers[token] = TimerEntry(System.nanoTime(), stepIndex, stepId)
        return token
    }

    fun endTimer(token: Int) {
        val entry = activeTimers[token] ?: return
        if (entry.consumed) return
        entry.consumed = true

        val durationMs = (System.nanoTime() - entry.startNanos) / 1_000_000.0

        var step: StoryStep? = null
        if (entry.stepId != null) {
            step = steps.find { it.id == entry.stepId }
        }
        if (step == null && entry.stepIndex != null && entry.stepIndex < steps.size) {
            step = steps[entry.stepIndex]
        }
        step?.durationMs = durationMs
    }

    companion object {
        private val ORDER_COUNTER = AtomicInteger(0)

        @JvmStatic
        internal fun resetOrderCounter() {
            ORDER_COUNTER.set(0)
        }
    }

    private fun isPrimary(keyword: String): Boolean = keyword == "Given" || keyword == "When" || keyword == "Then"
}
