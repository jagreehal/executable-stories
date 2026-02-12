package dev.executablestories.junit5

import java.util.function.Supplier

/**
 * Static fluent API for defining BDD stories within JUnit 5 tests.
 * Uses ThreadLocal to maintain per-test story state.
 */
class Story private constructor() {

    companion object {
        private val CONTEXT = ThreadLocal<StoryContext>()

        // ====================================================================
        // Init
        // ====================================================================

        @JvmStatic
        fun init(scenario: String) {
            val ctx = StoryContext(scenario)
            CONTEXT.set(ctx)
            bridgeOtel(ctx)
        }

        @JvmStatic
        fun init(scenario: String, vararg tags: String) {
            val ctx = StoryContext(scenario, *tags)
            CONTEXT.set(ctx)
            bridgeOtel(ctx)
        }

        // ====================================================================
        // Step methods
        // ====================================================================

        @JvmStatic
        fun given(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun given(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        @JvmName("when")
        fun `when`(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        @JvmName("when")
        fun `when`(text: String, vararg docs: DocEntry) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun then(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun then(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Then", text, *docs)
        }

        @JvmStatic
        fun and(text: String) {
            requireContext().addStep("And", text)
        }

        @JvmStatic
        fun and(text: String, vararg docs: DocEntry) {
            requireContext().addStep("And", text, *docs)
        }

        @JvmStatic
        fun but(text: String) {
            requireContext().addStep("But", text)
        }

        @JvmStatic
        fun but(text: String, vararg docs: DocEntry) {
            requireContext().addStep("But", text, *docs)
        }

        // ====================================================================
        // AAA Pattern Aliases
        // ====================================================================

        @JvmStatic
        fun arrange(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun arrange(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun act(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun act(text: String, vararg docs: DocEntry) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun assertThat(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun assertThat(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Then", text, *docs)
        }

        // ====================================================================
        // Additional Aliases
        // ====================================================================

        @JvmStatic
        fun setup(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun setup(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun context(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun context(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun execute(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun execute(text: String, vararg docs: DocEntry) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun action(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun action(text: String, vararg docs: DocEntry) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun verify(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun verify(text: String, vararg docs: DocEntry) {
            requireContext().addStep("Then", text, *docs)
        }

        // ====================================================================
        // Doc methods
        // ====================================================================

        @JvmStatic
        fun note(text: String) {
            requireContext().addDoc(DocEntry.note(text))
        }

        @JvmStatic
        fun tag(vararg names: String) {
            requireContext().addDoc(DocEntry.tag(*names))
        }

        @JvmStatic
        fun kv(label: String, value: Any?) {
            requireContext().addDoc(DocEntry.kv(label, value))
        }

        @JvmStatic
        fun json(label: String, value: Any?) {
            requireContext().addDoc(DocEntry.json(label, value))
        }

        @JvmStatic
        fun code(label: String, content: String) {
            requireContext().addDoc(DocEntry.code(label, content, null))
        }

        @JvmStatic
        fun code(label: String, content: String, lang: String) {
            requireContext().addDoc(DocEntry.code(label, content, lang))
        }

        @JvmStatic
        fun table(label: String, columns: Array<String>, rows: Array<Array<String>>) {
            requireContext().addDoc(DocEntry.table(label, columns, rows))
        }

        @JvmStatic
        fun link(label: String, url: String) {
            requireContext().addDoc(DocEntry.link(label, url))
        }

        @JvmStatic
        fun section(title: String, markdown: String) {
            requireContext().addDoc(DocEntry.section(title, markdown))
        }

        @JvmStatic
        fun mermaid(code: String) {
            requireContext().addDoc(DocEntry.mermaid(code, null))
        }

        @JvmStatic
        fun mermaid(code: String, title: String) {
            requireContext().addDoc(DocEntry.mermaid(code, title))
        }

        @JvmStatic
        fun screenshot(path: String) {
            requireContext().addDoc(DocEntry.screenshot(path, null))
        }

        @JvmStatic
        fun screenshot(path: String, alt: String) {
            requireContext().addDoc(DocEntry.screenshot(path, alt))
        }

        @JvmStatic
        fun custom(type: String, data: Any?) {
            requireContext().addDoc(DocEntry.custom(type, data))
        }

        // ====================================================================
        // Attachment methods
        // ====================================================================

        @JvmStatic
        fun attach(name: String, mediaType: String, path: String) {
            requireContext().addAttachment(name, mediaType, path, null, null, null, null)
        }

        @JvmStatic
        fun attachInline(name: String, mediaType: String, body: String, encoding: String) {
            requireContext().addAttachment(name, mediaType, null, body, encoding, null, null)
        }

        // ====================================================================
        // Step timing
        // ====================================================================

        @JvmStatic
        fun startTimer(): Int = requireContext().startTimer()

        @JvmStatic
        fun endTimer(token: Int) {
            requireContext().endTimer(token)
        }

        // ====================================================================
        // Wrapped step execution
        // ====================================================================

        @JvmStatic
        fun fn(keyword: String, text: String, body: Runnable) {
            val ctx = requireContext()
            ctx.addStep(keyword, text)
            val step = ctx.currentStep!!
            step.wrapped = true

            val start = System.nanoTime()
            try {
                body.run()
            } finally {
                step.durationMs = (System.nanoTime() - start) / 1_000_000.0
            }
        }

        @JvmStatic
        fun <T> fn(keyword: String, text: String, body: Supplier<T>): T {
            val ctx = requireContext()
            ctx.addStep(keyword, text)
            val step = ctx.currentStep!!
            step.wrapped = true

            val start = System.nanoTime()
            try {
                return body.get()
            } finally {
                step.durationMs = (System.nanoTime() - start) / 1_000_000.0
            }
        }

        @JvmStatic
        fun expect(text: String, body: Runnable) {
            fn("Then", text, body)
        }

        @JvmStatic
        fun <T> expect(text: String, body: Supplier<T>): T =
            fn("Then", text, body)

        // ====================================================================
        // OTel Bridge
        // ====================================================================

        private fun bridgeOtel(ctx: StoryContext) {
            try {
                val spanClass = Class.forName("io.opentelemetry.api.trace.Span")
                val currentMethod = spanClass.getMethod("current")
                val span = currentMethod.invoke(null) ?: return

                val spanContextMethod = spanClass.getMethod("getSpanContext")
                val spanContext = spanContextMethod.invoke(span) ?: return

                val spanContextClass = spanContext.javaClass
                val getTraceId = spanContextClass.getMethod("getTraceId")
                val getSpanId = spanContextClass.getMethod("getSpanId")
                val isValid = spanContextClass.getMethod("isValid")

                if (isValid.invoke(spanContext) != true) return

                val traceId = getTraceId.invoke(spanContext) as? String ?: return
                val spanId = getSpanId.invoke(spanContext) as? String ?: return

                if (traceId == "00000000000000000000000000000000") return

                // OTel -> Story: capture traceId in structured meta
                ctx.meta["otel"] = mapOf("traceId" to traceId, "spanId" to spanId)

                // OTel -> Story: inject human-readable doc entries
                ctx.docs.add(DocEntry.kv("Trace ID", traceId))

                val template = System.getenv("OTEL_TRACE_URL_TEMPLATE")
                if (!template.isNullOrEmpty()) {
                    val url = template.replace("{traceId}", traceId)
                    ctx.docs.add(DocEntry.link("View Trace", url))
                }

                // Story -> OTel: enrich active span with story attributes
                val setAttributeStr = spanClass.getMethod("setAttribute", String::class.java, String::class.java)
                setAttributeStr.invoke(span, "story.scenario", ctx.scenario)

                if (ctx.tags.isNotEmpty()) {
                    // Use AttributeKey<List<String>> for array attributes
                    try {
                        val attributeKeyClass = Class.forName("io.opentelemetry.api.common.AttributeKey")
                        val stringArrayKeyMethod = attributeKeyClass.getMethod("stringArrayKey", String::class.java)
                        val tagsKey = stringArrayKeyMethod.invoke(null, "story.tags")
                        val setAttributeKey = spanClass.getMethod("setAttribute", attributeKeyClass, Any::class.java)
                        setAttributeKey.invoke(span, tagsKey, ctx.tags.toList())
                    } catch (_: Exception) { /* array attributes not available */ }
                }

                if (ctx.tickets.isNotEmpty()) {
                    try {
                        val attributeKeyClass = Class.forName("io.opentelemetry.api.common.AttributeKey")
                        val stringArrayKeyMethod = attributeKeyClass.getMethod("stringArrayKey", String::class.java)
                        val ticketsKey = stringArrayKeyMethod.invoke(null, "story.tickets")
                        val setAttributeKey = spanClass.getMethod("setAttribute", attributeKeyClass, Any::class.java)
                        setAttributeKey.invoke(span, ticketsKey, ctx.tickets.toList())
                    } catch (_: Exception) { /* array attributes not available */ }
                }
            } catch (_: ClassNotFoundException) {
                // OTel API not on classpath - no-op
            } catch (_: Exception) {
                // OTel not available - no-op
            }
        }

        // ====================================================================
        // Internal
        // ====================================================================

        @JvmStatic
        internal fun getContext(): StoryContext? = CONTEXT.get()

        @JvmStatic
        fun clear() {
            CONTEXT.remove()
        }

        private fun requireContext(): StoryContext =
            CONTEXT.get() ?: throw IllegalStateException(
                "Story.init() must be called before using Story step/doc methods. " +
                    "Did you forget to call Story.init(\"scenario name\") at the start of your test?"
            )
    }
}
