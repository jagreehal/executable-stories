package dev.executablestories.junit5

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class StoryApiTest {
    @BeforeEach
    fun setUp() {
        Story.clear()
        StoryContext.resetOrderCounter()
    }

    @AfterEach
    fun tearDown() {
        Story.clear()
    }

    @Test
    fun plannedMarksTheContextAsNotBuiltYet() {
        Story.planned("checkout is blocked for a suspended account", "checkout")

        val ctx = Story.getContext()
        assertNotNull(ctx, "planned should create a context")
        assertTrue(ctx!!.planned, "context should be marked planned")
        assertEquals("checkout is blocked for a suspended account", ctx.scenario)
        assertTrue(ctx.steps.isEmpty(), "a planned scenario carries no steps")
        assertEquals(listOf("checkout"), ctx.tags)
    }

    @Test
    fun initIsNotPlanned() {
        Story.init("User logs in")

        assertTrue(Story.getContext()?.planned == false)
    }

    @Test
    fun initCreatesContext() {
        assertNull(Story.getContext(), "Context should be null before init")

        Story.init("User logs in")

        val ctx = Story.getContext()
        assertNotNull(ctx, "Context should exist after init")
        assertEquals("User logs in", ctx!!.scenario)
        assertTrue(ctx.steps.isEmpty())
        assertTrue(ctx.tags.isEmpty())
    }

    @Test
    fun initWithTagsCreatesContextWithTags() {
        Story.init("User logs in", "smoke", "auth")

        val ctx = Story.getContext()
        assertNotNull(ctx)
        assertEquals("User logs in", ctx!!.scenario)
        assertEquals(listOf("smoke", "auth"), ctx.tags)
    }

    @Test
    fun coversIsRecordedAndSerialized() {
        Story.init("User logs in")
        Story.covers("src/auth/Login.kt", "src/Session.kt")

        val ctx = Story.getContext()
        assertNotNull(ctx)
        assertEquals(listOf("src/auth/Login.kt", "src/Session.kt"), ctx!!.covers)
        assertEquals(listOf("src/auth/Login.kt", "src/Session.kt"), ctx.toStoryMeta().covers)
    }

    @Test
    fun stepMethodsAddSteps() {
        Story.init("Shopping cart flow")

        Story.given("a product in the catalog")
        Story.given("another product in the catalog")
        Story.`when`("the user adds it to cart")
        Story.then("the cart count is 1")
        Story.and("the total is updated")
        Story.but("the user has not checked out")

        val ctx = Story.getContext()!!
        assertEquals(6, ctx.steps.size)

        assertEquals("Given", ctx.steps[0].keyword)
        assertEquals("a product in the catalog", ctx.steps[0].text)

        assertEquals("And", ctx.steps[1].keyword)
        assertEquals("another product in the catalog", ctx.steps[1].text)

        assertEquals("When", ctx.steps[2].keyword)
        assertEquals("the user adds it to cart", ctx.steps[2].text)

        assertEquals("Then", ctx.steps[3].keyword)
        assertEquals("the cart count is 1", ctx.steps[3].text)

        assertEquals("And", ctx.steps[4].keyword)
        assertEquals("the total is updated", ctx.steps[4].text)

        assertEquals("But", ctx.steps[5].keyword)
        assertEquals("the user has not checked out", ctx.steps[5].text)
    }

    @Test
    fun autoAndAppliesAcrossNonConsecutivePrimarySteps() {
        Story.init("Auto-And non-consecutive")

        Story.given("first given")
        Story.`when`("a when in between")
        Story.given("second given")

        val ctx = Story.getContext()!!
        assertEquals(3, ctx.steps.size)

        assertEquals("Given", ctx.steps[0].keyword)
        assertEquals("When", ctx.steps[1].keyword)
        assertEquals("And", ctx.steps[2].keyword)
    }

    @Test
    fun docMethodsAttachToCurrentStep() {
        Story.init("Doc attachment test")

        Story.given("some precondition")
        Story.note("This is a note on the Given step")
        Story.kv("userId", 42)

        val ctx = Story.getContext()!!
        val givenStep = ctx.steps[0]
        assertNotNull(givenStep.docs)
        assertEquals(2, givenStep.docs!!.size)

        val noteEntry = givenStep.docs!![0]
        assertEquals("note", noteEntry.kind)
        assertEquals("This is a note on the Given step", noteEntry["text"])

        val kvEntry = givenStep.docs!![1]
        assertEquals("kv", kvEntry.kind)
        assertEquals("userId", kvEntry["label"])
        assertEquals(42, kvEntry["value"])
    }

    @Test
    fun docMethodsAttachToStoryLevelWhenNoStep() {
        Story.init("Story-level docs test")

        Story.note("Story-level note")
        Story.tag("important")

        val ctx = Story.getContext()!!
        assertTrue(ctx.steps.isEmpty(), "No steps should exist yet")
        assertEquals(2, ctx.docs.size)

        assertEquals("note", ctx.docs[0].kind)
        assertEquals("tag", ctx.docs[1].kind)
    }

    @Test
    fun jsonProducesCodeEntryWithLangJson() {
        Story.init("JSON doc test")

        Story.given("an API response")
        val payload = mapOf("status" to "ok", "count" to 3)
        Story.json("Response Body", payload)

        val ctx = Story.getContext()!!
        val step = ctx.steps[0]
        assertEquals(1, step.docs!!.size)

        val jsonEntry = step.docs!![0]
        assertEquals("code", jsonEntry.kind)
        assertEquals("Response Body", jsonEntry["label"])
        assertEquals("json", jsonEntry["lang"])
        val content = jsonEntry["content"] as String
        assertNotNull(content)
        assertTrue(content.contains("status"), "JSON content should contain 'status'")
        assertTrue(content.contains("ok"), "JSON content should contain 'ok'")
    }

    @Test
    fun stateDocEntryWithLabel() {
        Story.init("State doc test")
        Story.given("a cart with 2 items")
        Story.state(mapOf("items" to 2, "total" to 59.98), "Basket")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("state", entry.kind)
        assertEquals("Basket", entry["label"])
        assertEquals(mapOf("items" to 2, "total" to 59.98), entry["value"])
        assertEquals("runtime", entry["phase"])
    }

    @Test
    fun stateDocEntryWithoutLabelOmitsLabelInJson() {
        Story.init("State no-label test")
        Story.given("some step")
        Story.state(mapOf("ok" to true))

        val entry = Story.getContext()!!.steps[0].docs!![0]
        assertEquals("state", entry.kind)
        assertNull(entry["label"])

        val mapper = ObjectMapper().registerKotlinModule()
        val json = mapper.writeValueAsString(entry)
        assertTrue(!json.contains("\"label\""), "JSON should not contain label key when null")
    }

    @Test
    fun stateDocEntryNestedValueRoundTrips() {
        Story.init("State nested test")
        Story.given("some step")
        Story.state(mapOf("user" to mapOf("id" to 1, "roles" to listOf("admin"))), "Session")

        val entry = Story.getContext()!!.steps[0].docs!![0]
        val mapper = ObjectMapper().registerKotlinModule()
        val node = mapper.readTree(mapper.writeValueAsString(entry))
        assertEquals("state", node["kind"].asText())
        assertEquals("Session", node["label"].asText())
        assertEquals("runtime", node["phase"].asText())
        assertEquals(1, node["value"]["user"]["id"].asInt())
        assertEquals("admin", node["value"]["user"]["roles"][0].asText())
    }

    @Test
    fun codeDocEntry() {
        Story.init("Code doc test")
        Story.given("some step")
        Story.code("SQL Query", "SELECT * FROM users", "sql")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("code", entry.kind)
        assertEquals("SQL Query", entry["label"])
        assertEquals("SELECT * FROM users", entry["content"])
        assertEquals("sql", entry["lang"])
    }

    @Test
    fun codeDocEntryWithoutLang() {
        Story.init("Code no-lang test")
        Story.given("some step")
        Story.code("Script", "echo hello")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("code", entry.kind)
        assertNull(entry["lang"], "lang should be null when not specified")
    }

    @Test
    fun tableDocEntry() {
        Story.init("Table doc test")
        Story.given("some step")
        Story.table(
            "Users",
            arrayOf("Name", "Role"),
            arrayOf(arrayOf("Alice", "Admin"), arrayOf("Bob", "User")),
        )

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("table", entry.kind)
        assertEquals("Users", entry["label"])
    }

    @Test
    fun linkDocEntry() {
        Story.init("Link doc test")
        Story.given("some step")
        Story.link("Documentation", "https://example.com/docs")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("link", entry.kind)
        assertEquals("Documentation", entry["label"])
        assertEquals("https://example.com/docs", entry["url"])
    }

    @Test
    fun sectionDocEntry() {
        Story.init("Section doc test")
        Story.given("some step")
        Story.section("Details", "## More info\nSome markdown here.")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("section", entry.kind)
        assertEquals("Details", entry["title"])
        assertEquals("## More info\nSome markdown here.", entry["markdown"])
    }

    @Test
    fun mermaidDocEntry() {
        Story.init("Mermaid doc test")
        Story.given("some step")
        Story.mermaid("graph TD; A-->B;")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("mermaid", entry.kind)
        assertEquals("graph TD; A-->B;", entry["code"])
        assertNull(entry["title"])
    }

    @Test
    fun mermaidDocEntryWithTitle() {
        Story.init("Mermaid titled test")
        Story.given("some step")
        Story.mermaid("graph TD; A-->B;", "Flow")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("mermaid", entry.kind)
        assertEquals("Flow", entry["title"])
    }

    @Test
    fun screenshotDocEntry() {
        Story.init("Screenshot doc test")
        Story.given("some step")
        Story.screenshot("/tmp/screen.png", "Login page")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("screenshot", entry.kind)
        assertEquals("/tmp/screen.png", entry["path"])
        assertEquals("Login page", entry["alt"])
    }

    @Test
    fun screenshotDocEntryWithoutAlt() {
        Story.init("Screenshot no-alt test")
        Story.given("some step")
        Story.screenshot("/tmp/screen.png")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("screenshot", entry.kind)
        assertNull(entry["alt"])
    }

    @Test
    fun htmlDocEntryWithPath() {
        Story.init("Html doc test")
        Story.given("some step")
        Story.html(path = "./coverage/index.html", title = "Coverage", height = 600)

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("html", entry.kind)
        assertEquals("./coverage/index.html", entry["path"])
        assertEquals("Coverage", entry["title"])
        assertEquals(600, entry["height"])
        assertNull(entry["url"])
        assertNull(entry["content"])
    }

    @Test
    fun htmlDocEntryWithContent() {
        Story.init("Html content test")
        Story.given("some step")
        Story.html(content = "<h1>Hi</h1>")

        val entry = Story.getContext()!!.steps[0].docs!![0]
        assertEquals("html", entry.kind)
        assertEquals("<h1>Hi</h1>", entry["content"])
    }

    @Test
    fun htmlDocEntryRequiresExactlyOneSource() {
        Story.init("Html validation test")
        Story.given("some step")
        assertThrows(IllegalArgumentException::class.java) { Story.html(title = "x") }
        assertThrows(IllegalArgumentException::class.java) {
            Story.html(path = "a.html", url = "https://x.test")
        }
    }

    @Test
    fun customDocEntry() {
        Story.init("Custom doc test")
        Story.given("some step")
        Story.custom("myType", mapOf("key" to "value"))

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("custom", entry.kind)
        assertEquals("myType", entry["type"])
    }

    @Test
    fun tagDocEntry() {
        Story.init("Tag doc test")
        Story.given("some step")
        Story.tag("smoke", "regression")

        val step = Story.getContext()!!.steps[0]
        val entry = step.docs!![0]
        assertEquals("tag", entry.kind)
        assertEquals(listOf("smoke", "regression"), entry["names"])
    }

    @Test
    fun toStoryMetaConvertsCorrectly() {
        Story.init("Conversion test", "tag1")

        Story.note("Story note")
        Story.given("a step")
        Story.note("Step note")

        val ctx = Story.getContext()!!
        val meta = ctx.toStoryMeta()

        assertEquals("Conversion test", meta.scenario)
        assertEquals(listOf("tag1"), meta.tags)
        assertNotNull(meta.steps)
        assertEquals(1, meta.steps!!.size)
        assertNotNull(meta.docs)
        assertEquals(1, meta.docs!!.size)
        assertNotNull(meta.sourceOrder)
    }

    @Test
    fun sourceOrderIncrements() {
        Story.init("First")
        val order1 = Story.getContext()!!.sourceOrder
        Story.clear()

        Story.init("Second")
        val order2 = Story.getContext()!!.sourceOrder

        assertTrue(order2 > order1, "Source order should increment")
    }

    @Test
    fun requireContextThrowsWithoutInit() {
        assertThrows(IllegalStateException::class.java) { Story.given("some step") }
    }

    @Test
    fun clearRemovesContext() {
        Story.init("To be cleared")
        assertNotNull(Story.getContext())

        Story.clear()
        assertNull(Story.getContext())
    }

    // ========================================================================
    // AAA and extra alias parity
    // ========================================================================

    @Test
    fun aaaAliasesProduceCorrectKeywords() {
        Story.init("AAA test")
        Story.arrange("setup state")
        Story.act("perform action")
        Story.assertThat("check result")

        val ctx = Story.getContext()!!
        assertEquals(3, ctx.steps.size)
        assertEquals("Given", ctx.steps[0].keyword)
        assertEquals("When", ctx.steps[1].keyword)
        assertEquals("Then", ctx.steps[2].keyword)
    }

    @Test
    fun extraAliasesProduceCorrectKeywords() {
        Story.init("Extra aliases")
        Story.setup("initial")
        Story.context("more context")
        Story.execute("the op")
        Story.action("another")
        Story.verify("outcome")

        val ctx = Story.getContext()!!
        assertEquals(5, ctx.steps.size)
        assertEquals("Given", ctx.steps[0].keyword)
        assertEquals("And", ctx.steps[1].keyword)
        assertEquals("When", ctx.steps[2].keyword)
        assertEquals("And", ctx.steps[3].keyword)
        assertEquals("Then", ctx.steps[4].keyword)
    }

    @Test
    fun inlineDocsAttachToStep() {
        Story.init("Inline docs test")
        Story.given("a step", DocEntry.note("a note"))
        Story.given("another step", DocEntry.note("second"), DocEntry.kv("key", "value"))

        val ctx = Story.getContext()!!
        val first = ctx.steps[0]
        assertNotNull(first.docs)
        assertEquals(1, first.docs!!.size)
        assertEquals("note", first.docs!![0].kind)
        assertEquals("a note", first.docs!![0]["text"])

        val second = ctx.steps[1]
        assertEquals(2, second.docs!!.size)
        assertEquals("note", second.docs!![0].kind)
        assertEquals("kv", second.docs!![1].kind)
    }

    // ========================================================================
    // Fn and Expect tests
    // ========================================================================

    @Test
    fun fnCreatesWrappedStep() {
        Story.init("fn test")
        var called = false
        Story.fn("Given", "a wrapped precondition", Runnable { called = true })

        assertTrue(called, "body should be called")
        val ctx = Story.getContext()!!
        assertEquals(1, ctx.steps.size)
        val step = ctx.steps[0]
        assertEquals("Given", step.keyword)
        assertEquals("a wrapped precondition", step.text)
        assertEquals(true, step.wrapped)
        assertNotNull(step.durationMs)
    }

    @Test
    fun fnRecordsDuration() {
        Story.init("fn duration")
        Story.fn(
            "When",
            "I wait briefly",
            Runnable {
                try {
                    Thread.sleep(15)
                } catch (e: InterruptedException) {
                    throw RuntimeException(e)
                }
            },
        )

        val step = Story.getContext()!!.steps[0]
        assertNotNull(step.durationMs)
        assertTrue(step.durationMs!! >= 10.0)
    }

    @Test
    fun fnPropagatesExceptions() {
        Story.init("fn error")
        assertThrows(RuntimeException::class.java) {
            Story.fn("Then", "it fails", Runnable { throw RuntimeException("boom") })
        }

        val step = Story.getContext()!!.steps[0]
        assertNotNull(step.durationMs)
    }

    @Test
    fun fnAutoAndConversion() {
        Story.init("fn auto-and")
        Story.given("a text-only step")
        Story.fn("Given", "a wrapped step", Runnable {})

        val ctx = Story.getContext()!!
        assertEquals("Given", ctx.steps[0].keyword)
        assertEquals("And", ctx.steps[1].keyword)
        assertEquals(true, ctx.steps[1].wrapped)
    }

    @Test
    fun fnWithSupplierReturnsResult() {
        Story.init("fn return")
        val result = Story.fn("When", "I compute", java.util.function.Supplier { 42 })
        assertEquals(42, result)
    }

    @Test
    fun fnIntegrationWithMarkers() {
        Story.init("fn + markers")
        Story.given("a text-only precondition")
        Story.fn("When", "I perform action", Runnable {})
        Story.then("a text-only assertion")
        Story.fn("Then", "the wrapped assertion", Runnable {})

        val ctx = Story.getContext()!!
        assertEquals(4, ctx.steps.size)
        assertNull(ctx.steps[0].wrapped)
        assertEquals(true, ctx.steps[1].wrapped)
        assertNull(ctx.steps[2].wrapped)
        assertEquals(true, ctx.steps[3].wrapped)
    }

    @Test
    fun expectCreatesWrappedThenStep() {
        Story.init("expect test")
        var called = false
        Story.expect("the result is correct", Runnable { called = true })

        assertTrue(called)
        val step = Story.getContext()!!.steps[0]
        assertEquals("Then", step.keyword)
        assertEquals("the result is correct", step.text)
        assertEquals(true, step.wrapped)
        assertNotNull(step.durationMs)
    }

    @Test
    fun expectWithSupplierReturnsResult() {
        Story.init("expect return")
        val result = Story.expect("check value", java.util.function.Supplier { true })
        assertTrue(result)
    }

    @Test
    fun expectPropagatesExceptions() {
        Story.init("expect error")
        assertThrows(AssertionError::class.java) {
            Story.expect("it should fail", Runnable { throw AssertionError("wrong") })
        }

        val step = Story.getContext()!!.steps[0]
        assertNotNull(step.durationMs)
    }

    // ========================================================================
    // Step timing tests
    // ========================================================================

    @Test
    fun startTimerEndTimerSetsDurationMsOnStep() {
        Story.init("Timing test")
        Story.given("a step")
        val token = Story.startTimer()
        Thread.sleep(15)
        Story.endTimer(token)

        val ctx = Story.getContext()!!
        val step = ctx.steps[0]
        assertNotNull(step.durationMs)
        assertTrue(step.durationMs!! >= 10.0, "durationMs should be at least 10ms")
    }

    @Test
    fun doubleEndTimerIsNoOp() {
        Story.init("Double end")
        Story.given("a step")
        val token = Story.startTimer()
        Thread.sleep(10)
        Story.endTimer(token)
        val first = Story.getContext()!!.steps[0].durationMs!!
        Thread.sleep(20)
        Story.endTimer(token) // no-op
        val second = Story.getContext()!!.steps[0].durationMs!!
        assertEquals(first, second, 0.01, "Second endTimer should not change durationMs")
    }

    @Test
    fun orphanedTimerLeavesStepWithoutDuration() {
        Story.init("Orphaned timer")
        Story.given("a step")
        Story.startTimer()
        // no endTimer call

        val ctx = Story.getContext()!!
        assertNull(ctx.steps[0].durationMs)
    }

    @Test
    fun stepEventsWouldIncludeTimedSteps() {
        Story.init("Step events")
        Story.given("first")
        val t1 = Story.startTimer()
        Thread.sleep(5)
        Story.endTimer(t1)
        Story.`when`("second") // no timer
        Story.then("third")
        val t3 = Story.startTimer()
        Thread.sleep(5)
        Story.endTimer(t3)

        val ctx = Story.getContext()!!
        val stepEvents = mutableListOf<Map<String, Any?>>()
        ctx.steps.forEachIndexed { i, step ->
            if (step.durationMs != null) {
                val event = LinkedHashMap<String, Any?>()
                event["index"] = i
                event["title"] = step.text
                event["durationMs"] = step.durationMs
                stepEvents.add(event)
            }
        }
        assertEquals(2, stepEvents.size)
        assertEquals("first", stepEvents[0]["title"])
        assertEquals("third", stepEvents[1]["title"])
    }

    // ========================================================================
    // traceUrlTemplate tests
    // ========================================================================

    @Test
    fun withTraceUrlTemplateSetsOnContext() {
        Story.init("Trace template test")
        Story.withTraceUrlTemplate("https://tempo.example.com/trace/{traceId}")

        val ctx = Story.getContext()!!
        assertEquals("https://tempo.example.com/trace/{traceId}", ctx.traceUrlTemplate)
    }

    @Test
    fun traceUrlTemplateDefaultsToNull() {
        Story.init("No template")

        val ctx = Story.getContext()!!
        assertNull(ctx.traceUrlTemplate)
    }

    // ========================================================================
    // DocEntry children tests
    // ========================================================================

    @Test
    fun docEntryWithChildrenSerializesCorrectly() {
        val child1 = DocEntry.note("child note")
        val child2 = DocEntry.kv("key", "value")
        val parent = DocEntry.note("parent note", listOf(child1, child2))

        assertEquals("note", parent.kind)
        assertEquals("parent note", parent["text"])

        @Suppress("UNCHECKED_CAST")
        val children = parent["children"] as List<DocEntry>
        assertEquals(2, children.size)
        assertEquals("note", children[0].kind)
        assertEquals("kv", children[1].kind)

        // Verify Jackson serialization
        val mapper = ObjectMapper().registerKotlinModule()
        val json = mapper.writeValueAsString(parent)
        assertTrue(json.contains("\"children\""), "JSON should contain children key")
        assertTrue(json.contains("child note"), "JSON should contain child note text")
    }

    @Test
    fun docEntryWithoutChildrenOmitsField() {
        val entry = DocEntry.note("no children")
        assertNull(entry["children"], "children should be null when not provided")

        val mapper = ObjectMapper().registerKotlinModule()
        val json = mapper.writeValueAsString(entry)
        assertTrue(!json.contains("\"children\""), "JSON should not contain children key when empty")
    }

    @Test
    fun docEntryChildrenOnAllKinds() {
        val child = DocEntry.note("child")
        val children = listOf(child)

        // Test children on each factory method
        assertNotNull(DocEntry.note("text", children)["children"])
        assertNotNull(DocEntry.tag(listOf("t"), children)["children"])
        assertNotNull(DocEntry.kv("k", "v", children)["children"])
        assertNotNull(DocEntry.code("l", "c", null, children)["children"])
        assertNotNull(DocEntry.json("l", "{}", children)["children"])
        assertNotNull(DocEntry.state(mapOf("k" to "v"), "l", children)["children"])
        assertNotNull(
            DocEntry.table("l", arrayOf("c"), arrayOf(arrayOf("r")), children)["children"],
        )
        assertNotNull(DocEntry.link("l", "u", children)["children"])
        assertNotNull(DocEntry.section("t", "md", children)["children"])
        assertNotNull(DocEntry.mermaid("code", null, children)["children"])
        assertNotNull(DocEntry.screenshot("p", null, children)["children"])
        assertNotNull(DocEntry.custom("t", null, children)["children"])
    }

    @Test
    fun docChildrenReparentAcrossSteps() {
        Story.init("Reparent children")
        Story.given("first step")
        val child = Story.note("shared child")
        Story.`when`("second step")

        val parent = DocEntry.note("parent note", listOf(child))
        Story.getContext()!!.addDoc(parent)

        val ctx = Story.getContext()!!
        assertTrue(ctx.steps[0].docs.isNullOrEmpty())
        assertEquals(listOf(parent), ctx.steps[1].docs)
    }

    // ========================================================================
    // Ticket object tests
    // ========================================================================

    @Test
    fun ticketWithIdOnly() {
        Story.init("Ticket id-only test")
        Story.ticket("PROJ-123")

        val ctx = Story.getContext()!!
        assertEquals(1, ctx.tickets.size)
        assertEquals("PROJ-123", ctx.tickets[0].id)
        assertNull(ctx.tickets[0].url)
    }

    @Test
    fun ticketWithIdAndUrl() {
        Story.init("Ticket with URL test")
        Story.ticket("PROJ-456", "https://jira.example.com/PROJ-456")

        val ctx = Story.getContext()!!
        assertEquals(1, ctx.tickets.size)
        assertEquals("PROJ-456", ctx.tickets[0].id)
        assertEquals("https://jira.example.com/PROJ-456", ctx.tickets[0].url)
    }

    @Test
    fun ticketObjectSerializesCorrectly() {
        val mapper = ObjectMapper().registerKotlinModule()

        val ticketWithUrl = Ticket("PROJ-1", "https://example.com/1")
        val json1 = mapper.writeValueAsString(ticketWithUrl)
        assertTrue(json1.contains("\"id\""), "JSON should contain id")
        assertTrue(json1.contains("\"url\""), "JSON should contain url")
        assertTrue(json1.contains("PROJ-1"))
        assertTrue(json1.contains("https://example.com/1"))

        val ticketNoUrl = Ticket("PROJ-2")
        val json2 = mapper.writeValueAsString(ticketNoUrl)
        assertTrue(json2.contains("\"id\""), "JSON should contain id")
        assertTrue(!json2.contains("\"url\""), "JSON should omit null url")
    }

    @Test
    fun ticketObjectPassedDirectly() {
        Story.init("Ticket object test")
        Story.ticket(Ticket("PROJ-789", "https://example.com/789"))

        val ctx = Story.getContext()!!
        assertEquals(1, ctx.tickets.size)
        assertEquals("PROJ-789", ctx.tickets[0].id)
        assertEquals("https://example.com/789", ctx.tickets[0].url)
    }

    @Test
    fun ticketsInStoryMeta() {
        Story.init("Ticket meta test")
        Story.ticket("T-1")
        Story.ticket("T-2", "https://example.com/T-2")

        val meta = Story.getContext()!!.toStoryMeta()
        assertNotNull(meta.tickets)
        assertEquals(2, meta.tickets!!.size)
        assertEquals("T-1", meta.tickets!![0].id)
        assertNull(meta.tickets!![0].url)
        assertEquals("T-2", meta.tickets!![1].id)
        assertEquals("https://example.com/T-2", meta.tickets!![1].url)
    }

    // ========================================================================
    // Doc methods return DocEntry tests
    // ========================================================================

    @Test
    fun docMethodsReturnDocEntry() {
        Story.init("Return DocEntry test")
        Story.given("a step")

        val noteEntry = Story.note("a note")
        assertEquals("note", noteEntry.kind)
        assertEquals("a note", noteEntry["text"])

        val kvEntry = Story.kv("key", "value")
        assertEquals("kv", kvEntry.kind)

        val linkEntry = Story.link("label", "https://example.com")
        assertEquals("link", linkEntry.kind)

        val codeEntry = Story.code("label", "content", "kotlin")
        assertEquals("code", codeEntry.kind)

        val sectionEntry = Story.section("title", "markdown")
        assertEquals("section", sectionEntry.kind)

        val mermaidEntry = Story.mermaid("graph TD;")
        assertEquals("mermaid", mermaidEntry.kind)

        val screenshotEntry = Story.screenshot("/tmp/img.png")
        assertEquals("screenshot", screenshotEntry.kind)

        val customEntry = Story.custom("myType", mapOf("a" to 1))
        assertEquals("custom", customEntry.kind)

        val jsonEntry = Story.json("data", mapOf("x" to 1))
        assertEquals("code", jsonEntry.kind)

        val tagEntry = Story.tag("smoke")
        assertEquals("tag", tagEntry.kind)
    }
}
