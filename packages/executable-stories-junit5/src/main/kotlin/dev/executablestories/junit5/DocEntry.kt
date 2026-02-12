package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonAnyGetter
import com.fasterxml.jackson.annotation.JsonAnySetter
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper

@JsonInclude(JsonInclude.Include.NON_NULL)
class DocEntry {

    private val fields: MutableMap<String, Any?> = LinkedHashMap()

    @JsonAnyGetter
    fun getFields(): Map<String, Any?> = fields

    @JsonAnySetter
    fun set(key: String, value: Any?) {
        fields[key] = value
    }

    operator fun get(key: String): Any? = fields[key]

    val kind: String?
        get() = fields["kind"]?.toString()

    companion object {
        @JvmStatic
        fun note(text: String): DocEntry = DocEntry().apply {
            set("kind", "note")
            set("text", text)
            set("phase", "runtime")
        }

        @JvmStatic
        fun tag(vararg names: String): DocEntry = DocEntry().apply {
            set("kind", "tag")
            set("names", names.toList())
            set("phase", "runtime")
        }

        @JvmStatic
        fun kv(label: String, value: Any?): DocEntry = DocEntry().apply {
            set("kind", "kv")
            set("label", label)
            set("value", value)
            set("phase", "runtime")
        }

        @JvmStatic
        @JvmOverloads
        fun code(label: String, content: String, lang: String? = null): DocEntry = DocEntry().apply {
            set("kind", "code")
            set("label", label)
            set("content", content)
            if (lang != null) set("lang", lang)
            set("phase", "runtime")
        }

        @JvmStatic
        fun json(label: String, value: Any?): DocEntry {
            val content = when (value) {
                is String -> value
                else -> try {
                    ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(value)
                } catch (e: com.fasterxml.jackson.core.JsonProcessingException) {
                    value.toString()
                }
            }
            return code(label, content, "json")
        }

        @JvmStatic
        fun table(label: String, columns: Array<String>, rows: Array<Array<String>>): DocEntry = DocEntry().apply {
            set("kind", "table")
            set("label", label)
            set("columns", columns.toList())
            set("rows", rows.map { it.toList() })
            set("phase", "runtime")
        }

        @JvmStatic
        fun link(label: String, url: String): DocEntry = DocEntry().apply {
            set("kind", "link")
            set("label", label)
            set("url", url)
            set("phase", "runtime")
        }

        @JvmStatic
        fun section(title: String, markdown: String): DocEntry = DocEntry().apply {
            set("kind", "section")
            set("title", title)
            set("markdown", markdown)
            set("phase", "runtime")
        }

        @JvmStatic
        @JvmOverloads
        fun mermaid(code: String, title: String? = null): DocEntry = DocEntry().apply {
            set("kind", "mermaid")
            set("code", code)
            if (title != null) set("title", title)
            set("phase", "runtime")
        }

        @JvmStatic
        @JvmOverloads
        fun screenshot(path: String, alt: String? = null): DocEntry = DocEntry().apply {
            set("kind", "screenshot")
            set("path", path)
            if (alt != null) set("alt", alt)
            set("phase", "runtime")
        }

        @JvmStatic
        fun custom(type: String, data: Any?): DocEntry = DocEntry().apply {
            set("kind", "custom")
            set("type", type)
            set("data", data)
            set("phase", "runtime")
        }
    }
}
