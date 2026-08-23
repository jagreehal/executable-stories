using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// What a class's scenarios are for, declared with <see cref="Story.Feature"/>.
    /// </summary>
    /// <remarks>
    /// Scenarios say what the system does. A declaration says why the feature
    /// exists and who it serves, so a reader meets the intent before the examples.
    /// </remarks>
    public class RawFeature
    {
        /// <summary>Key the report groups by. On .NET this is the test class.</summary>
        [JsonPropertyName("sourceFile")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? SourceFile { get; set; }

        /// <summary>Heading for the feature.</summary>
        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        /// <summary>
        /// How to introduce it: <c>feature</c> (the default), <c>ability</c> for
        /// something a person can now do, or <c>business-need</c> for cross-cutting
        /// concerns like security and performance that nobody asks for by name.
        /// </summary>
        [JsonPropertyName("kind")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Kind { get; set; }

        /// <summary>Markdown explaining why the feature exists and who it serves.</summary>
        [JsonPropertyName("narrative")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Narrative { get; set; }

        /// <summary>Tags applied to every scenario in the class.</summary>
        [JsonPropertyName("tags")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Tags { get; set; }

        /// <summary>Terms this feature defines.</summary>
        [JsonPropertyName("glossary")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<RawGlossaryTerm>? Glossary { get; set; }
    }

    /// <summary>One entry in a feature's glossary.</summary>
    public class RawGlossaryTerm
    {
        /// <summary>The term as it appears in scenario and step text.</summary>
        [JsonPropertyName("term")]
        public string Term { get; set; } = "";

        /// <summary>What it means, in one or two sentences.</summary>
        [JsonPropertyName("definition")]
        public string Definition { get; set; } = "";
    }
}
