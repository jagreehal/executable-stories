using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Represents a ticket reference with an ID and optional URL.
    /// </summary>
    public record Ticket(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("url")] string? Url = null
    );

    /// <summary>
    /// BDD story metadata for a test case.
    /// Matches the StoryMeta definition in the raw-run schema.
    /// </summary>
    public class StoryMeta
    {
        [JsonPropertyName("scenario")]
        public string Scenario { get; set; } = default!;

        [JsonPropertyName("steps")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<StoryStep>? Steps { get; set; }

        [JsonPropertyName("tags")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Tags { get; set; }

        [JsonPropertyName("tickets")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<Ticket>? Tickets { get; set; }

        [JsonPropertyName("covers")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Covers { get; set; }

        [JsonPropertyName("meta")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Dictionary<string, object>? Meta { get; set; }

        [JsonPropertyName("suitePath")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? SuitePath { get; set; }

        [JsonPropertyName("docs")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<DocEntry>? Docs { get; set; }

        [JsonPropertyName("sourceOrder")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? SourceOrder { get; set; }

        [JsonPropertyName("otelSpans")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<object>? OtelSpans { get; set; }
    }
}
