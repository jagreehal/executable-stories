package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
class StoryStep() {
    var id: String? = null
    var keyword: String? = null
    var text: String? = null
    var mode: String? = null
    var wrapped: Boolean? = null

    /**
     * Assertions attributable to this step.
     *
     * JUnit 5 has no assertion counter, so this is set only when the author
     * wraps a claim in `expect`/`fn("Then", ..)`. Null means unobserved, which
     * is not the same as zero.
     */
    var assertions: Int? = null
    var durationMs: Double? = null
    var docs: MutableList<DocEntry>? = null

    constructor(keyword: String, text: String) : this() {
        this.keyword = keyword
        this.text = text
    }

    fun addDoc(doc: DocEntry) {
        if (docs == null) {
            docs = mutableListOf()
        }
        docs!!.add(doc)
    }
}
