using System.Text.Json;

namespace ExecutableStories.Xunit.Tests;

/// <summary>
/// Integration tests demonstrating end-to-end Story API usage and JSON serialization.
/// </summary>
public class IntegrationTests : IDisposable
{
    public IntegrationTests()
    {
        Story.Clear();
    }

    public void Dispose()
    {
        Story.Clear();
    }

    [Fact]
    public void EndToEnd_StoryApiProducesValidStoryMeta()
    {
        // Arrange & Act: use the Story API as a real test would
        Story.Init("User login flow", "smoke", "auth");
        Story.Note("Testing the happy-path login flow");
        Story.Given("a registered user with email alice@example.com");
        Story.Kv("email", "alice@example.com");
        Story.When("the user submits valid credentials");
        Story.Json("credentials", new { email = "alice@example.com", password = "***" });
        Story.Then("the user is redirected to the dashboard");
        Story.Link("dashboard", "https://app.example.com/dashboard");
        Story.And("a welcome message is displayed");

        // Assert: verify the context was built correctly
        var ctx = Story.GetContext()!;
        Assert.Equal("User login flow", ctx.Scenario);
        Assert.Equal(new[] { "smoke", "auth" }, ctx.Tags);
        Assert.Equal(4, ctx.Steps.Count);

        // Story-level doc (note before any step)
        Assert.Single(ctx.Docs);
        Assert.Equal("note", ctx.Docs[0].Kind);

        // Step-level docs
        Assert.Single(ctx.Steps[0].Docs!); // Given has kv
        Assert.Single(ctx.Steps[1].Docs!); // When has json
        Assert.Single(ctx.Steps[2].Docs!); // Then has link
    }

    [Fact]
    public void EndToEnd_StoryMetaSerializesToJson()
    {
        Story.Init("Serialization test");
        Story.Given("some precondition");
        Story.Note("An important note");
        Story.When("something happens");
        Story.Then("something is verified");

        var ctx = Story.GetContext()!;
        var meta = ctx.ToStoryMeta();

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var json = JsonSerializer.Serialize(meta, options);

        // Verify it's valid JSON and has the right structure
        Assert.Contains("\"scenario\"", json);
        Assert.Contains("\"Serialization test\"", json);
        Assert.Contains("\"steps\"", json);
        Assert.Contains("\"keyword\"", json);
        Assert.Contains("\"Given\"", json);
    }

    [Fact]
    public void EndToEnd_RawRunSerializesToJson()
    {
        Story.Init("RawRun test");
        Story.Given("a test");
        Story.Then("it passes");

        var ctx = Story.GetContext()!;

        var rawRun = new RawRun
        {
            TestCases = new List<RawTestCase>
            {
                new RawTestCase
                {
                    Title = "RawRun test",
                    Status = "pass",
                    DurationMs = 42.5,
                    StepEvents = new List<Dictionary<string, object>>
                    {
                        new()
                        {
                            ["index"] = 0,
                            ["title"] = "a test",
                            ["durationMs"] = 12.34
                        }
                    },
                    Story = ctx.ToStoryMeta()
                }
            },
            StartedAtMs = 1700000000000,
            FinishedAtMs = 1700000001000,
            ProjectRoot = "/project"
        };

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var json = JsonSerializer.Serialize(rawRun, options);

        Assert.Contains("\"testCases\"", json);
        Assert.Contains("\"status\"", json);
        Assert.Contains("\"pass\"", json);
        Assert.Contains("\"story\"", json);
        Assert.Contains("\"stepEvents\"", json);
        Assert.Contains("\"projectRoot\"", json);
    }

    [Fact]
    public void EndToEnd_RawRunWriterCreatesFile()
    {
        Story.Init("File output test");
        Story.Given("a precondition");
        Story.Then("a result");

        var ctx = Story.GetContext()!;

        var rawRun = new RawRun
        {
            TestCases = new List<RawTestCase>
            {
                new RawTestCase
                {
                    Title = "File output test",
                    Status = "pass",
                    DurationMs = 10,
                    Story = ctx.ToStoryMeta()
                }
            },
            ProjectRoot = "/project"
        };

        var tempPath = Path.Combine(Path.GetTempPath(), $"es-test-{Guid.NewGuid()}.json");
        try
        {
            RawRunWriter.Write(rawRun, tempPath);

            Assert.True(File.Exists(tempPath));

            var content = File.ReadAllText(tempPath);
            Assert.Contains("\"testCases\"", content);
            Assert.Contains("File output test", content);

            // Verify it's valid JSON
            var parsed = JsonDocument.Parse(content);
            Assert.NotNull(parsed);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    [Fact]
    public void EndToEnd_DocEntriesSerializeCorrectly()
    {
        Story.Init("Doc serialization");
        Story.Given("a step with many docs");
        Story.Note("A note");
        Story.Tag("api");
        Story.Kv("count", 5);
        Story.Code("sql", "SELECT 1", "sql");
        Story.Table("data", new[] { "A", "B" }, new[] { new[] { "1", "2" } });
        Story.Link("ref", "https://example.com");
        Story.Mermaid("graph TD; A-->B;");
        Story.Screenshot("/tmp/img.png", "alt text");

        var ctx = Story.GetContext()!;
        var meta = ctx.ToStoryMeta();

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var json = JsonSerializer.Serialize(meta, options);

        // Verify all doc kinds appear
        Assert.Contains("\"note\"", json);
        Assert.Contains("\"tag\"", json);
        Assert.Contains("\"kv\"", json);
        Assert.Contains("\"code\"", json);
        Assert.Contains("\"table\"", json);
        Assert.Contains("\"link\"", json);
        Assert.Contains("\"mermaid\"", json);
        Assert.Contains("\"screenshot\"", json);
        Assert.Contains("\"runtime\"", json);
    }
}
