using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit;

/// <summary>
/// A single BDD step in a scenario.
/// Matches the StoryStep definition in the raw-run schema.
/// </summary>
public class StoryStep
{
    [JsonPropertyName("keyword")]
    public string Keyword { get; set; } = default!;

    [JsonPropertyName("text")]
    public string Text { get; set; } = default!;

    [JsonPropertyName("mode")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Mode { get; set; }

    [JsonPropertyName("wrapped")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Wrapped { get; set; }

    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Id { get; set; }

    [JsonPropertyName("durationMs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? DurationMs { get; set; }

    [JsonPropertyName("docs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<DocEntry>? Docs { get; set; }
}
