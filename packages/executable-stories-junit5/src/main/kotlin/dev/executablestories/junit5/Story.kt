package dev.executablestories.junit5

import java.util.function.Supplier

/**
 * Static fluent API for defining BDD stories within JUnit 5 tests.
 * Uses ThreadLocal to maintain per-test story state.
 */
class Story private constructor() {
    companion object {
        private val CONTEXT = ThreadLocal<StoryContext>()

        /**
         * Declarations keyed by the class that made them, so a re-declaration
         * reads the way it does in source order.
         */
        private val FEATURES = java.util.concurrent.ConcurrentHashMap<String, Map<String, Any?>>()

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
        fun init(
            scenario: String,
            vararg tags: String,
        ) {
            val ctx = StoryContext(scenario, *tags)
            CONTEXT.set(ctx)
            bridgeOtel(ctx)
        }

        /**
         * Declares a scenario that is specified but not built yet. It appears in
         * the report marked "planned" and stops being planned once someone writes
         * it as a real story with [init].
         *
         * ```kotlin
         * @Test
         * fun `checkout is blocked for a suspended account`() {
         *     Story.planned("checkout is blocked for a suspended account")
         * }
         * ```
         *
         * `@Disabled` means "do not run this now", which is a different claim from
         * "we have not built this yet", so this does not disable the test for you.
         */
        @JvmStatic
        fun planned(
            scenario: String,
            vararg tags: String,
        ) {
            val ctx = StoryContext(scenario, *tags)
            ctx.planned = true
            CONTEXT.set(ctx)
        }

        @JvmStatic
        fun withTraceUrlTemplate(template: String) {
            requireContext().traceUrlTemplate = template
        }

        // ====================================================================
        // Step methods
        // ====================================================================

        @JvmStatic
        fun given(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun given(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        @JvmName("when")
        fun `when`(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        @JvmName("when")
        fun `when`(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun then(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun then(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Then", text, *docs)
        }

        @JvmStatic
        fun and(text: String) {
            requireContext().addStep("And", text)
        }

        @JvmStatic
        fun and(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("And", text, *docs)
        }

        @JvmStatic
        fun but(text: String) {
            requireContext().addStep("But", text)
        }

        @JvmStatic
        fun but(
            text: String,
            vararg docs: DocEntry,
        ) {
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
        fun arrange(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun act(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun act(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun assertThat(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun assertThat(
            text: String,
            vararg docs: DocEntry,
        ) {
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
        fun setup(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun context(text: String) {
            requireContext().addStep("Given", text)
        }

        @JvmStatic
        fun context(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Given", text, *docs)
        }

        @JvmStatic
        fun execute(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun execute(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun action(text: String) {
            requireContext().addStep("When", text)
        }

        @JvmStatic
        fun action(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("When", text, *docs)
        }

        @JvmStatic
        fun verify(text: String) {
            requireContext().addStep("Then", text)
        }

        @JvmStatic
        fun verify(
            text: String,
            vararg docs: DocEntry,
        ) {
            requireContext().addStep("Then", text, *docs)
        }

        // ====================================================================
        // Doc methods
        // ====================================================================

        @JvmStatic
        fun note(text: String): DocEntry {
            val entry = DocEntry.note(text)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun tag(vararg names: String): DocEntry {
            val entry = DocEntry.tag(*names)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun kv(
            label: String,
            value: Any?,
        ): DocEntry {
            val entry = DocEntry.kv(label, value)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun json(
            label: String,
            value: Any?,
        ): DocEntry {
            val entry = DocEntry.json(label, value)
            requireContext().addDoc(entry)
            return entry
        }

        /** Snapshot of the world at the current step (kind=state). */
        @JvmStatic
        @JvmOverloads
        fun state(
            value: Any?,
            label: String? = null,
        ): DocEntry {
            val entry = DocEntry.state(value, label)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun code(
            label: String,
            content: String,
        ): DocEntry {
            val entry = DocEntry.code(label, content, null)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun code(
            label: String,
            content: String,
            lang: String,
        ): DocEntry {
            val entry = DocEntry.code(label, content, lang)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun table(
            label: String,
            columns: Array<String>,
            rows: Array<Array<String>>,
        ): DocEntry {
            val entry = DocEntry.table(label, columns, rows)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun link(
            label: String,
            url: String,
        ): DocEntry {
            val entry = DocEntry.link(label, url)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun section(
            title: String,
            markdown: String,
        ): DocEntry {
            val entry = DocEntry.section(title, markdown)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun mermaid(code: String): DocEntry {
            val entry = DocEntry.mermaid(code, null)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun mermaid(
            code: String,
            title: String,
        ): DocEntry {
            val entry = DocEntry.mermaid(code, title)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun screenshot(path: String): DocEntry {
            val entry = DocEntry.screenshot(path, null)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun screenshot(
            path: String,
            alt: String,
        ): DocEntry {
            val entry = DocEntry.screenshot(path, alt)
            requireContext().addDoc(entry)
            return entry
        }

        /**
         * Attach an embedded-HTML doc entry. Exactly one of [path], [url], or
         * [content] must be non-null.
         */
        @JvmStatic
        @JvmOverloads
        fun html(
            path: String? = null,
            url: String? = null,
            content: String? = null,
            title: String? = null,
            height: Any? = null,
        ): DocEntry {
            val entry = DocEntry.html(path, url, content, title, height)
            requireContext().addDoc(entry)
            return entry
        }

        @JvmStatic
        fun custom(
            type: String,
            data: Any?,
        ): DocEntry {
            val entry = DocEntry.custom(type, data)
            requireContext().addDoc(entry)
            return entry
        }

        // ====================================================================
        // Ticket methods
        // ====================================================================

        @JvmStatic
        fun ticket(id: String) {
            requireContext().tickets.add(Ticket(id))
        }

        @JvmStatic
        fun ticket(
            id: String,
            url: String,
        ) {
            requireContext().tickets.add(Ticket(id, url))
        }

        @JvmStatic
        fun ticket(ticket: Ticket) {
            requireContext().tickets.add(ticket)
        }

        /** Declare the product-code paths/globs this story exercises. */
        @JvmStatic
        fun covers(vararg paths: String) {
            requireContext().covers.addAll(paths.toList())
        }

        // ====================================================================
        // Attachment methods
        // ====================================================================

        @JvmStatic
        fun attach(
            name: String,
            mediaType: String,
            path: String,
        ) {
            requireContext().addAttachment(name, mediaType, path, null, null, null, null)
        }

        @JvmStatic
        fun attachInline(
            name: String,
            mediaType: String,
            body: String,
            encoding: String,
        ) {
            requireContext().addAttachment(name, mediaType, null, body, encoding, null, null)
        }

        // ====================================================================
        // OTel span attachment
        // ====================================================================

        @JvmStatic
        fun attachSpans(spans: List<Any>) {
            requireContext().otelSpans = spans
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
        fun fn(
            keyword: String,
            text: String,
            body: Runnable,
        ) {
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
        fun <T> fn(
            keyword: String,
            text: String,
            body: Supplier<T>,
        ): T {
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
        fun expect(
            text: String,
            body: Runnable,
        ) {
            fn("Then", text, body)
        }

        @JvmStatic
        fun <T> expect(
            text: String,
            body: Supplier<T>,
        ): T = fn("Then", text, body)

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

                val template = ctx.traceUrlTemplate ?: System.getenv("OTEL_TRACE_URL_TEMPLATE")
                if (!template.isNullOrEmpty()) {
                    val url = template.replace("{traceId}", traceId)
                    ctx.docs.add(DocEntry.link("View Trace", url))
                }

                // Story -> OTel: enrich active span with story attributes
                val setAttributeStr = spanClass.getMethod("setAttribute", String::class.java, String::class.java)
                setAttributeStr.invoke(span, "story.scenario", ctx.scenario)

                if (ctx.tags.isNotEmpty()) {
                    setOtelArrayAttribute(spanClass, span, "story.tags", ctx.tags.toList())
                }

                if (ctx.tickets.isNotEmpty()) {
                    setOtelArrayAttribute(spanClass, span, "story.tickets", ctx.tickets.map { it.id })
                }
            } catch (_: ClassNotFoundException) {
                // OTel API not on classpath - no-op
            } catch (_: Exception) {
                // OTel not available - no-op
            }
        }

        private fun setOtelArrayAttribute(
            spanClass: Class<*>,
            span: Any,
            key: String,
            values: List<String>,
        ) {
            try {
                val attributeKeyClass = Class.forName("io.opentelemetry.api.common.AttributeKey")
                val stringArrayKeyMethod = attributeKeyClass.getMethod("stringArrayKey", String::class.java)
                val attrKey = stringArrayKeyMethod.invoke(null, key)
                val setAttributeKey = spanClass.getMethod("setAttribute", attributeKeyClass, Any::class.java)
                setAttributeKey.invoke(span, attrKey, values)
            } catch (_: Exception) {
                // array attributes not available
            }
        }

        // ====================================================================
        // Internal
        // ====================================================================

        /**
         * Declare what a class's scenarios are for, ahead of the examples.
         *
         * Scenarios say what the system does. A declaration says why the
         * feature exists and who it serves, so a reader meets the intent
         * before the examples. Call it once per test class, from `@BeforeAll`:
         *
         * ```kotlin
         * companion object {
         *     @BeforeAll
         *     @JvmStatic
         *     fun declareFeature() {
         *         Story.feature(
         *             title = "Anyone can do arithmetic without a calculator app",
         *             kind = "ability",
         *             narrative = "Switching apps for a quick sum loses your place.",
         *         )
         *     }
         * }
         * ```
         *
         * The JVM gives us no source path, so the declaring class is the key
         * the report groups by, taken from the call stack.
         */
        @JvmStatic
        @JvmOverloads
        fun feature(
            title: String,
            kind: String? = null,
            narrative: String? = null,
            tags: List<String>? = null,
            glossary: Map<String, String>? = null,
        ) {
            val key = callerClassName() ?: return
            val declared = LinkedHashMap<String, Any?>()
            declared["sourceFile"] = key
            declared["title"] = title
            if (kind != null) declared["kind"] = kind
            if (narrative != null) declared["narrative"] = narrative
            if (!tags.isNullOrEmpty()) declared["tags"] = tags
            if (!glossary.isNullOrEmpty()) {
                declared["glossary"] =
                    glossary.map { (term, definition) ->
                        linkedMapOf<String, Any?>("term" to term, "definition" to definition)
                    }
            }
            FEATURES[key] = declared
        }

        @JvmStatic
        internal fun declaredFeatures(): List<Map<String, Any?>> = FEATURES.values.toList()

        /**
         * Class that called into this object, with Kotlin's synthetic suffixes
         * dropped so a declaration made from a companion object still keys to
         * the test class itself.
         */
        private fun callerClassName(): String? {
            val frames = Thread.currentThread().stackTrace
            for (frame in frames) {
                val name = frame.className
                if (name.startsWith("java.") || name.startsWith("dev.executablestories.junit5.Story")) {
                    continue
                }
                return name.substringBefore("\$Companion").substringBefore("\$\$")
            }
            return null
        }

        @JvmStatic
        internal fun getContext(): StoryContext? = CONTEXT.get()

        @JvmStatic
        fun clear() {
            CONTEXT.remove()
        }

        private fun requireContext(): StoryContext =
            CONTEXT.get() ?: throw IllegalStateException(
                "Story.init() must be called before using Story step/doc methods. " +
                    "Did you forget to call Story.init(\"scenario name\") at the start of your test?",
            )
    }
}
