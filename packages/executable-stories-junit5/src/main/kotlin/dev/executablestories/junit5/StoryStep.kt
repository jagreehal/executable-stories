package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
class StoryStep() {

    var id: String? = null
    var keyword: String? = null
    var text: String? = null
    var mode: String? = null
    var wrapped: Boolean? = null
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
