package dev.executablestories.junit5

import java.util.concurrent.atomic.AtomicInteger

class StoryContext(val scenario: String) {

    private class TimerEntry(
        val startNanos: Long,
        val stepIndex: Int?,
        val stepId: String?,
        var consumed: Boolean = false
    )

    val steps: MutableList<StoryStep> = mutableListOf()
    val tags: MutableList<String> = mutableListOf()
    val tickets: MutableList<String> = mutableListOf()
    val meta: MutableMap<String, Any?> = LinkedHashMap()
    val docs: MutableList<DocEntry> = mutableListOf()
    val sourceOrder: Int = ORDER_COUNTER.getAndIncrement()

    var currentStep: StoryStep? = null
        private set

    private val seenPrimaryKeywords: MutableSet<String> = mutableSetOf()
    private var stepCounter = 0
    private val attachments: MutableList<Map<String, Any?>> = mutableListOf()

    private val activeTimers: MutableMap<Int, TimerEntry> = mutableMapOf()
    private var timerCounter = 0

    constructor(scenario: String, vararg tags: String) : this(scenario) {
        this.tags.addAll(tags.toList())
    }

    fun addStep(keyword: String, text: String) {
        addStep(keyword, text, null)
    }

    fun addStep(keyword: String, text: String, vararg docs: DocEntry?) {
        var effectiveKeyword = keyword
        if (isPrimary(keyword)) {
            if (!seenPrimaryKeywords.add(keyword)) {
                effectiveKeyword = "And"
            }
        }
        val step = StoryStep(effectiveKeyword, text)
        step.id = "step-${stepCounter++}"
        steps.add(step)
        currentStep = step
        for (doc in docs) {
            if (doc != null) {
                step.addDoc(doc)
            }
        }
    }

    fun addDoc(doc: DocEntry) {
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
        fileName: String?
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

    fun toStoryMeta(): StoryMeta = StoryMeta().apply {
        scenario = this@StoryContext.scenario
        steps = if (this@StoryContext.steps.isEmpty()) null else ArrayList(this@StoryContext.steps)
        tags = if (this@StoryContext.tags.isEmpty()) null else ArrayList(this@StoryContext.tags)
        tickets = if (this@StoryContext.tickets.isEmpty()) null else ArrayList(this@StoryContext.tickets)
        meta = if (this@StoryContext.meta.isEmpty()) null else LinkedHashMap(this@StoryContext.meta)
        docs = if (this@StoryContext.docs.isEmpty()) null else ArrayList(this@StoryContext.docs)
        sourceOrder = this@StoryContext.sourceOrder
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

    private fun isPrimary(keyword: String): Boolean =
        keyword == "Given" || keyword == "When" || keyword == "Then"
}
