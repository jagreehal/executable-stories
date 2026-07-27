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
    fun set(
        key: String,
        value: Any?,
    ) {
        fields[key] = value
    }

    operator fun get(key: String): Any? = fields[key]

    val kind: String?
        get() = fields["kind"]?.toString()

    companion object {
        @JvmStatic
        @JvmOverloads
        fun note(
            text: String,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "note")
                set("text", text)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        fun tag(vararg names: String): DocEntry = tag(names.toList(), null)

        @JvmStatic
        @JvmOverloads
        fun tag(
            names: List<String>,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "tag")
                set("names", names)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun kv(
            label: String,
            value: Any?,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "kv")
                set("label", label)
                set("value", value)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun code(
            label: String,
            content: String,
            lang: String? = null,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "code")
                set("label", label)
                set("content", content)
                if (lang != null) set("lang", lang)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun json(
            label: String,
            value: Any?,
            children: List<DocEntry>? = null,
        ): DocEntry {
            val content =
                when (value) {
                    is String -> value
                    else ->
                        try {
                            ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(value)
                        } catch (e: com.fasterxml.jackson.core.JsonProcessingException) {
                            value.toString()
                        }
                }
            return code(label, content, "json", children)
        }

        /**
         * JSON-serializable snapshot of the world at this step. [label] names the
         * entity ('Basket') so the renderer can diff consecutive snapshots.
         */
        @JvmStatic
        @JvmOverloads
        fun state(
            value: Any?,
            label: String? = null,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "state")
                if (label != null) set("label", label)
                set("value", value)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun table(
            label: String,
            columns: Array<String>,
            rows: Array<Array<String>>,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "table")
                set("label", label)
                set("columns", columns.toList())
                set("rows", rows.map { it.toList() })
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun link(
            label: String,
            url: String,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "link")
                set("label", label)
                set("url", url)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun section(
            title: String,
            markdown: String,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "section")
                set("title", title)
                set("markdown", markdown)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun mermaid(
            code: String,
            title: String? = null,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "mermaid")
                set("code", code)
                if (title != null) set("title", title)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        @JvmStatic
        @JvmOverloads
        fun screenshot(
            path: String,
            alt: String? = null,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "screenshot")
                set("path", path)
                if (alt != null) set("alt", alt)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }

        /**
         * Embedded HTML rendered inside an always-sandboxed iframe.
         *
         * Exactly one of [path], [url], or [content] must be non-null, or an
         * [IllegalArgumentException] is thrown.
         *
         * One optional parameter per supported source/option mirrors the
         * cross-language doc model — hence the LongParameterList suppression.
         */
        @Suppress("LongParameterList")
        @JvmStatic
        @JvmOverloads
        fun html(
            path: String? = null,
            url: String? = null,
            content: String? = null,
            title: String? = null,
            height: Any? = null,
            children: List<DocEntry>? = null,
        ): DocEntry {
            val sources = listOfNotNull(path, url, content)
            require(sources.size == 1) {
                "Story.html requires exactly one of path, url, or content"
            }
            return DocEntry().apply {
                set("kind", "html")
                set("phase", "runtime")
                if (path != null) set("path", path)
                if (url != null) set("url", url)
                if (content != null) set("content", content)
                if (title != null) set("title", title)
                if (height != null) set("height", height)
                if (!children.isNullOrEmpty()) set("children", children)
            }
        }

        @JvmStatic
        @JvmOverloads
        fun custom(
            type: String,
            data: Any?,
            children: List<DocEntry>? = null,
        ): DocEntry =
            DocEntry().apply {
                set("kind", "custom")
                set("type", type)
                set("data", data)
                set("phase", "runtime")
                if (!children.isNullOrEmpty()) set("children", children)
            }
    }
}
