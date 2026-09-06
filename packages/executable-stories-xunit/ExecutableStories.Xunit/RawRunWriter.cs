using System.Text.Json;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Writes a <see cref="RawRun"/> to a JSON file using System.Text.Json.
    /// </summary>
    public static class RawRunWriter
    {
        private static readonly JsonSerializerOptions s_options = new()
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        /// <summary>
        /// Serialize a RawRun to JSON and write it to the specified path.
        /// Creates parent directories if they do not exist.
        /// </summary>
        /// <remarks>
        /// The file is written beside its target and renamed into place. A watch
        /// task reading the report while a run finishes must always parse it, and
        /// a write that fails must leave the last good report rather than a
        /// truncated one — both of which a plain overwrite gives up.
        /// </remarks>
        public static void Write(RawRun run, string outputPath)
        {
            var dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir))
            {
                _ = Directory.CreateDirectory(dir);
            }

            // Serialized first, so a run that cannot be written never reaches
            // the temporary file, let alone the report already in place.
            var json = JsonSerializer.Serialize(run, s_options);

            var temp = $"{outputPath}.{Environment.ProcessId}.tmp";
            try
            {
                File.WriteAllText(temp, json);
                File.Move(temp, outputPath, overwrite: true);
            }
            finally
            {
                if (File.Exists(temp))
                {
                    File.Delete(temp);
                }
            }
        }
    }
}
