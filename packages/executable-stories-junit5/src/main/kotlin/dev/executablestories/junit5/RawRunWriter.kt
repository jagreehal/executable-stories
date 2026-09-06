package dev.executablestories.junit5

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import java.io.IOException
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

class RawRunWriter private constructor() {
    companion object {
        private val MAPPER: ObjectMapper =
            ObjectMapper().apply {
                registerKotlinModule()
                enable(SerializationFeature.INDENT_OUTPUT)
                setSerializationInclusion(JsonInclude.Include.NON_NULL)
            }

        /**
         * Write the run to [outputPath], through a temporary file in the same
         * directory.
         *
         * A watch task reading the report mid-run must always parse it, and a
         * write that fails must leave the last good report. Serializing first
         * keeps a run that cannot be written away from both.
         */
        @JvmStatic
        @Throws(IOException::class)
        fun writeRawRun(
            run: Map<String, Any?>,
            outputPath: Path,
        ) {
            val parent = outputPath.parent
            if (parent != null) {
                Files.createDirectories(parent)
            }

            val json = MAPPER.writeValueAsBytes(run)
            val temp = Files.createTempFile(parent ?: Path.of("."), ".raw-run", ".tmp")
            try {
                Files.write(temp, json)
                try {
                    Files.move(
                        temp,
                        outputPath,
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE,
                    )
                } catch (_: AtomicMoveNotSupportedException) {
                    // Some filesystems cannot promise it. A plain replace still
                    // beats writing over the report in place.
                    Files.move(temp, outputPath, StandardCopyOption.REPLACE_EXISTING)
                }
            } finally {
                Files.deleteIfExists(temp)
            }
        }

        @JvmStatic
        internal fun getMapper(): ObjectMapper = MAPPER
    }
}
