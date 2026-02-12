namespace ExecutableStories.Xunit.Tests;

/// <summary>
/// Unit tests for the Story static API: Init, step methods, and doc methods.
/// </summary>
public class StoryApiTests : IDisposable
{
    public StoryApiTests()
    {
        // Ensure clean state before each test
        Story.Clear();
    }

    public void Dispose()
    {
        Story.Clear();
    }

    // ========================================================================
    // Init
    // ========================================================================

    [Fact]
    public void Init_CreatesContext()
    {
        Story.Init("User logs in");

        var ctx = Story.GetContext();
        Assert.NotNull(ctx);
        Assert.Equal("User logs in", ctx!.Scenario);
    }

    [Fact]
    public void Init_WithTags_SetsTagsOnContext()
    {
        Story.Init("Tagged scenario", "smoke", "auth");

        var ctx = Story.GetContext();
        Assert.NotNull(ctx);
        Assert.Equal(new[] { "smoke", "auth" }, ctx!.Tags);
    }

    [Fact]
    public void Init_WithoutTags_HasEmptyTagsList()
    {
        Story.Init("No tags scenario");

        var ctx = Story.GetContext();
        Assert.NotNull(ctx);
        Assert.Empty(ctx!.Tags);
    }

    // ========================================================================
    // Step Methods
    // ========================================================================

    [Fact]
    public void Given_AddsGivenStep()
    {
        Story.Init("Step test");
        Story.Given("a user exists");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("a user exists", ctx.Steps[0].Text);
    }

    [Fact]
    public void When_AddsWhenStep()
    {
        Story.Init("Step test");
        Story.When("the user logs in");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.Equal("When", ctx.Steps[0].Keyword);
        Assert.Equal("the user logs in", ctx.Steps[0].Text);
    }

    [Fact]
    public void Then_AddsThenStep()
    {
        Story.Init("Step test");
        Story.Then("the user sees the dashboard");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.Equal("Then", ctx.Steps[0].Keyword);
        Assert.Equal("the user sees the dashboard", ctx.Steps[0].Text);
    }

    [Fact]
    public void And_AddsAndStep()
    {
        Story.Init("Step test");
        Story.And("another condition");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.Equal("And", ctx.Steps[0].Keyword);
    }

    [Fact]
    public void But_AddsButStep()
    {
        Story.Init("Step test");
        Story.But("an exception");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.Equal("But", ctx.Steps[0].Keyword);
    }

    [Fact]
    public void MultipleSteps_AccumulateInOrder()
    {
        Story.Init("Multi-step");
        Story.Given("a precondition");
        Story.When("an action occurs");
        Story.Then("a result is observed");
        Story.And("another result");

        var ctx = Story.GetContext()!;
        Assert.Equal(4, ctx.Steps.Count);
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("When", ctx.Steps[1].Keyword);
        Assert.Equal("Then", ctx.Steps[2].Keyword);
        Assert.Equal("And", ctx.Steps[3].Keyword);
    }

    [Fact]
    public void AutoAnd_RepeatedPrimaryKeyword_RendersAsAnd()
    {
        Story.Init("Auto-And across story");
        Story.Given("first given");
        Story.When("a when in between");
        Story.Given("second given");

        var ctx = Story.GetContext()!;
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("When", ctx.Steps[1].Keyword);
        Assert.Equal("And", ctx.Steps[2].Keyword);
    }

    // ========================================================================
    // AAA + extra alias parity
    // ========================================================================

    [Fact]
    public void AaaAliases_ProduceCorrectKeywords()
    {
        Story.Init("AAA test");
        Story.Arrange("setup state");
        Story.Act("perform action");
        Story.Assert("check result");

        var ctx = Story.GetContext()!;
        Assert.Equal(3, ctx.Steps.Count);
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("When", ctx.Steps[1].Keyword);
        Assert.Equal("Then", ctx.Steps[2].Keyword);
    }

    [Fact]
    public void ExtraAliases_ProduceCorrectKeywords()
    {
        Story.Init("Extra aliases test");
        Story.Setup("initial state");
        Story.Context("more context");
        Story.Execute("the operation");
        Story.Action("another action");
        Story.Verify("the outcome");

        var ctx = Story.GetContext()!;
        Assert.Equal(5, ctx.Steps.Count);
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("And", ctx.Steps[1].Keyword);
        Assert.Equal("When", ctx.Steps[2].Keyword);
        Assert.Equal("And", ctx.Steps[3].Keyword);
        Assert.Equal("Then", ctx.Steps[4].Keyword);
    }

    // ========================================================================
    // Inline docs on steps
    // ========================================================================

    [Fact]
    public void InlineDocs_AttachedToStep()
    {
        Story.Init("Inline docs test");
        Story.Given("a step", DocEntry.Note("a note"));

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        Assert.NotNull(ctx.Steps[0].Docs);
        Assert.Single(ctx.Steps[0].Docs!);
        Assert.Equal("note", ctx.Steps[0].Docs![0].Kind);
        Assert.Equal("a note", ctx.Steps[0].Docs![0].Get("text"));
    }

    // ========================================================================
    // Step timing
    // ========================================================================

    [Fact]
    public void StepTiming_SetsDurationMs()
    {
        Story.Init("Timing test");
        Story.Given("a step");
        var token = Story.GetContext()!.StartTimer();
        Thread.Sleep(15);
        Story.GetContext()!.EndTimer(token);

        var ctx = Story.GetContext()!;
        Assert.NotNull(ctx.Steps[0].DurationMs);
        Assert.True(ctx.Steps[0].DurationMs >= 10);
    }

    // ========================================================================
    // Step methods throw without Init
    // ========================================================================

    [Fact]
    public void Given_WithoutInit_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => Story.Given("oops"));
    }

    // ========================================================================
    // Doc Methods
    // ========================================================================

    [Fact]
    public void Note_AttachesToCurrentStep()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Note("This is a note");

        var ctx = Story.GetContext()!;
        Assert.NotNull(ctx.CurrentStep);
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("note", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("This is a note", ctx.CurrentStep.Docs[0].Get("text"));
    }

    [Fact]
    public void Note_WithoutStep_AttachesToStoryLevel()
    {
        Story.Init("Doc test");
        Story.Note("Story-level note");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Docs);
        Assert.Equal("note", ctx.Docs[0].Kind);
    }

    [Fact]
    public void Tag_AttachesTagDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Tag("api", "regression");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("tag", ctx.CurrentStep.Docs![0].Kind);
        var names = ctx.CurrentStep.Docs[0].Get("names") as List<string>;
        Assert.NotNull(names);
        Assert.Equal(new[] { "api", "regression" }, names);
    }

    [Fact]
    public void Tag_AddsToStoryTags()
    {
        Story.Init("Doc test", "smoke");
        Story.Tag("api", "regression");

        var ctx = Story.GetContext()!;
        Assert.Equal(new[] { "smoke", "api", "regression" }, ctx.Tags);
    }

    [Fact]
    public void Kv_AttachesKvDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Kv("userId", 42);

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("kv", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("userId", ctx.CurrentStep.Docs[0].Get("label"));
        Assert.Equal(42, ctx.CurrentStep.Docs[0].Get("value"));
    }

    [Fact]
    public void Json_AttachesCodeDocEntryWithJsonLang()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Json("payload", new { name = "test" });

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("code", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("json", ctx.CurrentStep.Docs[0].Get("lang"));
        Assert.Equal("payload", ctx.CurrentStep.Docs[0].Get("label"));
    }

    [Fact]
    public void Code_AttachesCodeDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Code("query", "SELECT * FROM users", "sql");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("code", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("sql", ctx.CurrentStep.Docs[0].Get("lang"));
        Assert.Equal("SELECT * FROM users", ctx.CurrentStep.Docs[0].Get("content"));
    }

    [Fact]
    public void Table_AttachesTableDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Table("users", new[] { "Name", "Age" }, new[] { new[] { "Alice", "30" } });

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("table", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("users", ctx.CurrentStep.Docs[0].Get("label"));
    }

    [Fact]
    public void Link_AttachesLinkDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Link("docs", "https://example.com");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("link", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("https://example.com", ctx.CurrentStep.Docs[0].Get("url"));
    }

    [Fact]
    public void Section_AttachesSectionDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Section("Details", "## More info\nSome text");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("section", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("Details", ctx.CurrentStep.Docs[0].Get("title"));
    }

    [Fact]
    public void Mermaid_AttachesMermaidDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Mermaid("graph TD; A-->B;", "Flow");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("mermaid", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("graph TD; A-->B;", ctx.CurrentStep.Docs[0].Get("code"));
        Assert.Equal("Flow", ctx.CurrentStep.Docs[0].Get("title"));
    }

    [Fact]
    public void Screenshot_AttachesScreenshotDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Screenshot("/tmp/screenshot.png", "Login page");

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("screenshot", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("/tmp/screenshot.png", ctx.CurrentStep.Docs[0].Get("path"));
        Assert.Equal("Login page", ctx.CurrentStep.Docs[0].Get("alt"));
    }

    [Fact]
    public void Custom_AttachesCustomDocEntry()
    {
        Story.Init("Doc test");
        Story.Given("a step");
        Story.Custom("myType", new { foo = "bar" });

        var ctx = Story.GetContext()!;
        Assert.Single(ctx.CurrentStep!.Docs!);
        Assert.Equal("custom", ctx.CurrentStep.Docs![0].Kind);
        Assert.Equal("myType", ctx.CurrentStep.Docs[0].Get("type"));
    }

    // ========================================================================
    // ToStoryMeta
    // ========================================================================

    [Fact]
    public void ToStoryMeta_ConvertsContextCorrectly()
    {
        Story.Init("Conversion test", "smoke");
        Story.Given("a precondition");
        Story.When("an action");
        Story.Then("a result");

        var ctx = Story.GetContext()!;
        var meta = ctx.ToStoryMeta();

        Assert.Equal("Conversion test", meta.Scenario);
        Assert.Equal(3, meta.Steps!.Count);
        Assert.Equal(new[] { "smoke" }, meta.Tags);
        Assert.NotNull(meta.SourceOrder);
    }

    [Fact]
    public void ToStoryMeta_NullsEmptyCollections()
    {
        Story.Init("Empty test");

        var ctx = Story.GetContext()!;
        var meta = ctx.ToStoryMeta();

        Assert.Null(meta.Steps);
        Assert.Null(meta.Tags);
        Assert.Null(meta.Tickets);
        Assert.Null(meta.Meta);
        Assert.Null(meta.Docs);
    }

    // ========================================================================
    // Fn and Expect
    // ========================================================================

    [Fact]
    public void Fn_CreatesWrappedStep()
    {
        Story.Init("Fn test");
        var called = false;
        Story.Fn("Given", "a wrapped precondition", () => called = true);

        Assert.True(called);
        var ctx = Story.GetContext()!;
        Assert.Single(ctx.Steps);
        var step = ctx.Steps[0];
        Assert.Equal("Given", step.Keyword);
        Assert.Equal("a wrapped precondition", step.Text);
        Assert.True(step.Wrapped);
        Assert.NotNull(step.DurationMs);
    }

    [Fact]
    public void Fn_RecordsDuration()
    {
        Story.Init("Fn duration");
        Story.Fn("When", "I wait briefly", () => Thread.Sleep(15));

        var step = Story.GetContext()!.Steps[0];
        Assert.NotNull(step.DurationMs);
        Assert.True(step.DurationMs >= 10.0, $"Expected >= 10ms, got {step.DurationMs}");
    }

    [Fact]
    public void Fn_PropagatesExceptions()
    {
        Story.Init("Fn error");
        Assert.Throws<InvalidOperationException>(() =>
            Story.Fn("Then", "it fails", () => throw new InvalidOperationException("boom")));

        var step = Story.GetContext()!.Steps[0];
        Assert.NotNull(step.DurationMs);
    }

    [Fact]
    public void Fn_AutoAndConversion()
    {
        Story.Init("Fn auto-and");
        Story.Given("a text-only step");
        Story.Fn("Given", "a wrapped step", () => { });

        var ctx = Story.GetContext()!;
        Assert.Equal("Given", ctx.Steps[0].Keyword);
        Assert.Equal("And", ctx.Steps[1].Keyword);
        Assert.True(ctx.Steps[1].Wrapped);
    }

    [Fact]
    public void Fn_WithFunc_ReturnsResult()
    {
        Story.Init("Fn return");
        var result = Story.Fn("When", "I compute", () => 42);
        Assert.Equal(42, result);
    }

    [Fact]
    public void Fn_IntegrationWithMarkers()
    {
        Story.Init("Fn + markers");
        Story.Given("a text-only precondition");
        Story.Fn("When", "I perform action", () => { });
        Story.Then("a text-only assertion");
        Story.Fn("Then", "the wrapped assertion", () => { });

        var ctx = Story.GetContext()!;
        Assert.Equal(4, ctx.Steps.Count);
        Assert.Null(ctx.Steps[0].Wrapped);
        Assert.True(ctx.Steps[1].Wrapped);
        Assert.Null(ctx.Steps[2].Wrapped);
        Assert.True(ctx.Steps[3].Wrapped);
    }

    [Fact]
    public void Expect_CreatesWrappedThenStep()
    {
        Story.Init("Expect test");
        var called = false;
        Story.Expect("the result is correct", () => called = true);

        Assert.True(called);
        var step = Story.GetContext()!.Steps[0];
        Assert.Equal("Then", step.Keyword);
        Assert.Equal("the result is correct", step.Text);
        Assert.True(step.Wrapped);
        Assert.NotNull(step.DurationMs);
    }

    [Fact]
    public void Expect_WithFunc_ReturnsResult()
    {
        Story.Init("Expect return");
        var result = Story.Expect("check value", () => true);
        Assert.True(result);
    }

    [Fact]
    public void Expect_PropagatesExceptions()
    {
        Story.Init("Expect error");
        Assert.Throws<InvalidOperationException>(() =>
            Story.Expect("it should fail", () => throw new InvalidOperationException("wrong")));

        var step = Story.GetContext()!.Steps[0];
        Assert.NotNull(step.DurationMs);
    }
}
