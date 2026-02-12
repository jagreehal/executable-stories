package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
class StoryMeta {

    var scenario: String? = null
    var steps: List<StoryStep>? = null
    var tags: List<String>? = null
    var tickets: List<String>? = null
    var meta: Map<String, Any?>? = null
    var suitePath: List<String>? = null
    var docs: List<DocEntry>? = null
    var sourceOrder: Int? = null
}
