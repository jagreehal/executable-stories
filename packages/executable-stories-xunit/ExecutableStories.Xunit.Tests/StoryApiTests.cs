namespace ExecutableStories.Xunit.Tests
{
    /// <summary>
    /// Unit tests for the Story static API: Init, step methods, and doc methods.
    /// </summary>
    public class StoryApiTests : IDisposable
    {
        private static readonly string[] s_tagsSmokeAuth = ["smoke", "auth"];
        private static readonly string[] s_tagsApiRegression = ["api", "regression"];
        private static readonly string[] s_tagsSmokeApiRegression = ["smoke", "api", "regression"];
        private static readonly string[] s_tagsSmoke = ["smoke"];

        public StoryApiTests()
        {
            // Ensure clean state before each test
            Story.Clear();
        }

        public void Dispose()
        {
            Story.Clear();
            GC.SuppressFinalize(this);
        }

        // ========================================================================
        // Init
        // ========================================================================

        [Fact]
        public void InitCreatesContext()
        {
            Story.Init("User logs in");

            StoryContext? ctx = Story.GetContext();
            Assert.NotNull(ctx);
            Assert.Equal("User logs in", ctx!.Scenario);
        }

        [Fact]
        public void InitWithTagsSetsTagsOnContext()
        {
            Story.Init("Tagged scenario", "smoke", "auth");

            StoryContext? ctx = Story.GetContext();
            Assert.NotNull(ctx);
            Assert.Equal(s_tagsSmokeAuth, ctx!.Tags);
        }

        [Fact]
        public void InitWithoutTagsHasEmptyTagsList()
        {
            Story.Init("No tags scenario");

            StoryContext? ctx = Story.GetContext();
            Assert.NotNull(ctx);
            Assert.Empty(ctx!.Tags);
        }

        // ========================================================================
        // Step Methods
        // ========================================================================

        [Fact]
        public void GivenAddsGivenStep()
        {
            Story.Init("Step test");
            Story.Given("a user exists");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.Equal("Given", ctx.Steps[0].Keyword);
            Assert.Equal("a user exists", ctx.Steps[0].Text);
        }

        [Fact]
        public void WhenAddsWhenStep()
        {
            Story.Init("Step test");
            Story.When("the user logs in");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.Equal("When", ctx.Steps[0].Keyword);
            Assert.Equal("the user logs in", ctx.Steps[0].Text);
        }

        [Fact]
        public void ThenAddsThenStep()
        {
            Story.Init("Step test");
            Story.Then("the user sees the dashboard");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.Equal("Then", ctx.Steps[0].Keyword);
            Assert.Equal("the user sees the dashboard", ctx.Steps[0].Text);
        }

        [Fact]
        public void AndAddsAndStep()
        {
            Story.Init("Step test");
            Story.And("another condition");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.Equal("And", ctx.Steps[0].Keyword);
        }

        [Fact]
        public void ButAddsButStep()
        {
            Story.Init("Step test");
            Story.But("an exception");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.Equal("But", ctx.Steps[0].Keyword);
        }

        [Fact]
        public void MultipleStepsAccumulateInOrder()
        {
            Story.Init("Multi-step");
            Story.Given("a precondition");
            Story.When("an action occurs");
            Story.Then("a result is observed");
            Story.And("another result");

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal(4, ctx.Steps.Count);
            Assert.Equal("Given", ctx.Steps[0].Keyword);
            Assert.Equal("When", ctx.Steps[1].Keyword);
            Assert.Equal("Then", ctx.Steps[2].Keyword);
            Assert.Equal("And", ctx.Steps[3].Keyword);
        }

        [Fact]
        public void AutoAndRepeatedPrimaryKeywordRendersAsAnd()
        {
            Story.Init("Auto-And across story");
            Story.Given("first given");
            Story.When("a when in between");
            Story.Given("second given");

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal("Given", ctx.Steps[0].Keyword);
            Assert.Equal("When", ctx.Steps[1].Keyword);
            Assert.Equal("And", ctx.Steps[2].Keyword);
        }

        // ========================================================================
        // AAA + extra alias parity
        // ========================================================================

        [Fact]
        public void AaaAliasesProduceCorrectKeywords()
        {
            Story.Init("AAA test");
            Story.Arrange("setup state");
            Story.Act("perform action");
            Story.Assert("check result");

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal(3, ctx.Steps.Count);
            Assert.Equal("Given", ctx.Steps[0].Keyword);
            Assert.Equal("When", ctx.Steps[1].Keyword);
            Assert.Equal("Then", ctx.Steps[2].Keyword);
        }

        [Fact]
        public void ExtraAliasesProduceCorrectKeywords()
        {
            Story.Init("Extra aliases test");
            Story.Setup("initial state");
            Story.Context("more context");
            Story.Execute("the operation");
            Story.Action("another action");
            Story.Verify("the outcome");

            StoryContext ctx = Story.GetContext()!;
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
        public void InlineDocsAttachedToStep()
        {
            Story.Init("Inline docs test");
            Story.Given("a step", DocEntry.Note("a note"));

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            Assert.NotNull(ctx.Steps[0].Docs);
            _ = Assert.Single(ctx.Steps[0].Docs!);
            Assert.Equal("note", ctx.Steps[0].Docs![0].Kind);
            Assert.Equal("a note", ctx.Steps[0].Docs![0].Get("text"));
        }

        // ========================================================================
        // Step timing
        // ========================================================================

        [Fact]
        public void StepTimingSetsDurationMs()
        {
            Story.Init("Timing test");
            Story.Given("a step");
            var token = Story.GetContext()!.StartTimer();
            Thread.Sleep(15);
            Story.GetContext()!.EndTimer(token);

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.NotNull(ctx.Steps[0].DurationMs);
            Assert.True(ctx.Steps[0].DurationMs >= 10);
        }

        [Fact]
        public void StaticStartTimerEndTimerRecordsDuration()
        {
            Story.Init("Static timer test");
            Story.Given("a timed step");
            var token = Story.StartTimer();
            Thread.Sleep(15);
            Story.EndTimer(token);

            StoryStep step = Story.GetContext()!.Steps[0];
            _ = Assert.NotNull(step.DurationMs);
            Assert.True(step.DurationMs >= 10, $"Expected >= 10ms, got {step.DurationMs}");
        }

        // ========================================================================
        // Step methods throw without Init
        // ========================================================================

        [Fact]
        public void GivenWithoutInitThrows()
        {
            _ = Assert.Throws<InvalidOperationException>(() => Story.Given("oops"));
        }

        // ========================================================================
        // Doc Methods
        // ========================================================================

        [Fact]
        public void NoteAttachesToCurrentStep()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Note("This is a note");

            StoryContext ctx = Story.GetContext()!;
            Assert.NotNull(ctx.CurrentStep);
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("note", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("This is a note", ctx.CurrentStep.Docs[0].Get("text"));
        }

        [Fact]
        public void NoteWithoutStepAttachesToStoryLevel()
        {
            Story.Init("Doc test");
            Story.Note("Story-level note");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Docs);
            Assert.Equal("note", ctx.Docs[0].Kind);
        }

        [Fact]
        public void TagAttachesTagDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Tag("api", "regression");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("tag", ctx.CurrentStep.Docs![0].Kind);
            var names = ctx.CurrentStep.Docs[0].Get("names") as List<string>;
            Assert.NotNull(names);
            Assert.Equal(s_tagsApiRegression, names);
        }

        [Fact]
        public void TagAddsToStoryTags()
        {
            Story.Init("Doc test", "smoke");
            Story.Tag("api", "regression");

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal(s_tagsSmokeApiRegression, ctx.Tags);
        }

        [Fact]
        public void KvAttachesKvDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Kv("userId", 42);

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("kv", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("userId", ctx.CurrentStep.Docs[0].Get("label"));
            Assert.Equal(42, ctx.CurrentStep.Docs[0].Get("value"));
        }

        [Fact]
        public void JsonAttachesCodeDocEntryWithJsonLang()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Json("payload", new { name = "test" });

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("code", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("json", ctx.CurrentStep.Docs[0].Get("lang"));
            Assert.Equal("payload", ctx.CurrentStep.Docs[0].Get("label"));
        }

        [Fact]
        public void CodeAttachesCodeDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Code("query", "SELECT * FROM users", "sql");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("code", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("sql", ctx.CurrentStep.Docs[0].Get("lang"));
            Assert.Equal("SELECT * FROM users", ctx.CurrentStep.Docs[0].Get("content"));
        }

        [Fact]
        public void TableAttachesTableDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Table("users", ["Name", "Age"], [["Alice", "30"]]);

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("table", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("users", ctx.CurrentStep.Docs[0].Get("label"));
        }

        [Fact]
        public void LinkAttachesLinkDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Link("docs", "https://example.com");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("link", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("https://example.com", ctx.CurrentStep.Docs[0].Get("url"));
        }

        [Fact]
        public void SectionAttachesSectionDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Section("Details", "## More info\nSome text");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("section", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("Details", ctx.CurrentStep.Docs[0].Get("title"));
        }

        [Fact]
        public void MermaidAttachesMermaidDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Mermaid("graph TD; A-->B;", "Flow");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("mermaid", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("graph TD; A-->B;", ctx.CurrentStep.Docs[0].Get("code"));
            Assert.Equal("Flow", ctx.CurrentStep.Docs[0].Get("title"));
        }

        [Fact]
        public void ScreenshotAttachesScreenshotDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Screenshot("/tmp/screenshot.png", "Login page");

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("screenshot", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("/tmp/screenshot.png", ctx.CurrentStep.Docs[0].Get("path"));
            Assert.Equal("Login page", ctx.CurrentStep.Docs[0].Get("alt"));
        }

        [Fact]
        public void CustomAttachesCustomDocEntry()
        {
            Story.Init("Doc test");
            Story.Given("a step");
            Story.Custom("myType", new { foo = "bar" });

            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.CurrentStep!.Docs!);
            Assert.Equal("custom", ctx.CurrentStep.Docs![0].Kind);
            Assert.Equal("myType", ctx.CurrentStep.Docs[0].Get("type"));
        }

        // ========================================================================
        // ToStoryMeta
        // ========================================================================

        [Fact]
        public void ToStoryMetaConvertsContextCorrectly()
        {
            Story.Init("Conversion test", "smoke");
            Story.Given("a precondition");
            Story.When("an action");
            Story.Then("a result");

            StoryContext ctx = Story.GetContext()!;
            var meta = ctx.ToStoryMeta();

            Assert.Equal("Conversion test", meta.Scenario);
            Assert.Equal(3, meta.Steps!.Count);
            Assert.Equal(s_tagsSmoke, meta.Tags);
            _ = Assert.NotNull(meta.SourceOrder);
        }

        [Fact]
        public void ToStoryMetaNullsEmptyCollections()
        {
            Story.Init("Empty test");

            StoryContext ctx = Story.GetContext()!;
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
        public void FnCreatesWrappedStep()
        {
            Story.Init("Fn test");
            var called = false;
            _ = Story.Fn("Given", "a wrapped precondition", () => called = true);

            Assert.True(called);
            StoryContext ctx = Story.GetContext()!;
            _ = Assert.Single(ctx.Steps);
            StoryStep step = ctx.Steps[0];
            Assert.Equal("Given", step.Keyword);
            Assert.Equal("a wrapped precondition", step.Text);
            Assert.True(step.Wrapped);
            _ = Assert.NotNull(step.DurationMs);
        }

        [Fact]
        public void FnRecordsDuration()
        {
            Story.Init("Fn duration");
            Story.Fn("When", "I wait briefly", () => Thread.Sleep(15));

            StoryStep step = Story.GetContext()!.Steps[0];
            _ = Assert.NotNull(step.DurationMs);
            Assert.True(step.DurationMs >= 10.0, $"Expected >= 10ms, got {step.DurationMs}");
        }

        [Fact]
        public void FnPropagatesExceptions()
        {
            Story.Init("Fn error");
            _ = Assert.Throws<InvalidOperationException>(() =>
                Story.Fn("Then", "it fails", () => throw new InvalidOperationException("boom")));

            StoryStep step = Story.GetContext()!.Steps[0];
            _ = Assert.NotNull(step.DurationMs);
        }

        [Fact]
        public void FnAutoAndConversion()
        {
            Story.Init("Fn auto-and");
            Story.Given("a text-only step");
            Story.Fn("Given", "a wrapped step", () => { });

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal("Given", ctx.Steps[0].Keyword);
            Assert.Equal("And", ctx.Steps[1].Keyword);
            Assert.True(ctx.Steps[1].Wrapped);
        }

        [Fact]
        public void FnWithFuncReturnsResult()
        {
            Story.Init("Fn return");
            var result = Story.Fn("When", "I compute", () => 42);
            Assert.Equal(42, result);
        }

        [Fact]
        public void FnIntegrationWithMarkers()
        {
            Story.Init("Fn + markers");
            Story.Given("a text-only precondition");
            Story.Fn("When", "I perform action", () => { });
            Story.Then("a text-only assertion");
            Story.Fn("Then", "the wrapped assertion", () => { });

            StoryContext ctx = Story.GetContext()!;
            Assert.Equal(4, ctx.Steps.Count);
            Assert.Null(ctx.Steps[0].Wrapped);
            Assert.True(ctx.Steps[1].Wrapped);
            Assert.Null(ctx.Steps[2].Wrapped);
            Assert.True(ctx.Steps[3].Wrapped);
        }

        [Fact]
        public void ExpectCreatesWrappedThenStep()
        {
            Story.Init("Expect test");
            var called = false;
            _ = Story.Expect("the result is correct", () => called = true);

            Assert.True(called);
            StoryStep step = Story.GetContext()!.Steps[0];
            Assert.Equal("Then", step.Keyword);
            Assert.Equal("the result is correct", step.Text);
            Assert.True(step.Wrapped);
            _ = Assert.NotNull(step.DurationMs);
        }

        [Fact]
        public void ExpectWithFuncReturnsResult()
        {
            Story.Init("Expect return");
            var result = Story.Expect("check value", () => true);
            Assert.True(result);
        }

        [Fact]
        public void ExpectPropagatesExceptions()
        {
            Story.Init("Expect error");
            _ = Assert.Throws<InvalidOperationException>(() =>
                Story.Expect("it should fail", () => throw new InvalidOperationException("wrong")));

            StoryStep step = Story.GetContext()!.Steps[0];
            _ = Assert.NotNull(step.DurationMs);
        }
    }
}
