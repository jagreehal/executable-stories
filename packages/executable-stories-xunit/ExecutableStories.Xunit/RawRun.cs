using System.Text.Json.Serialization;

namespace ExecutableStories.Xunit;

/// <summary>
/// Raw run output containing all test cases from a run.
/// Matches the RawRun definition in the raw-run schema.
/// </summary>
public class RawRun
{
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = 1;

    [JsonPropertyName("testCases")]
    public List<RawTestCase> TestCases { get; set; } = new();

    [JsonPropertyName("startedAtMs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? StartedAtMs { get; set; }

    [JsonPropertyName("finishedAtMs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? FinishedAtMs { get; set; }

    [JsonPropertyName("projectRoot")]
    public string ProjectRoot { get; set; } = "";

    [JsonPropertyName("packageVersion")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PackageVersion { get; set; }

    [JsonPropertyName("gitSha")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? GitSha { get; set; }

    [JsonPropertyName("ci")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RawCIInfo? Ci { get; set; }
}

/// <summary>
/// CI environment info.
/// </summary>
public class RawCIInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("url")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Url { get; set; }

    [JsonPropertyName("buildNumber")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? BuildNumber { get; set; }
}
