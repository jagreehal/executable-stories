package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path

class RawRunWriter private constructor() {

    companion object {
        private val MAPPER: ObjectMapper = ObjectMapper().apply {
            registerKotlinModule()
            enable(SerializationFeature.INDENT_OUTPUT)
            setSerializationInclusion(JsonInclude.Include.NON_NULL)
        }

        @JvmStatic
        @Throws(IOException::class)
        fun writeRawRun(run: Map<String, Any?>, outputPath: Path) {
            val parent = outputPath.parent
            if (parent != null) {
                Files.createDirectories(parent)
            }
            MAPPER.writeValue(outputPath.toFile(), run)
        }

        @JvmStatic
        internal fun getMapper(): ObjectMapper = MAPPER
    }
}
