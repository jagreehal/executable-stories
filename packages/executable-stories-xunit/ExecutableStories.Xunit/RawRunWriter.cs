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
        public static void Write(RawRun run, string outputPath)
        {
            var dir = Path.GetDirectoryName(outputPath);
            if (dir != null)
            {
                _ = Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(run, s_options);
            File.WriteAllText(outputPath, json);
        }
    }
}
