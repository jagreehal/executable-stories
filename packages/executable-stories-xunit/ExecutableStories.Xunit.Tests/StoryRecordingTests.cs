namespace ExecutableStories.Xunit.Tests
{
    /// <summary>
    /// Covers what <see cref="StoryRecordingAttribute"/> hands to the collector.
    /// The attribute itself is exercised end to end by apps/xunit-example.
    /// </summary>
    [StoryRecording]
    public class StoryRecordingTests
    {
        [Fact]
        public void BeginTestOpensAHolderThatSurvivesRecording()
        {
            Story.BeginTest();
            Story.Init("holder survives");
            Story.Given("a story created after BeginTest");

            Assert.NotNull(Story.GetContext());

            Story.RecordAndClear("pass", null, null);

            Assert.Null(Story.GetContext());
        }

        [Fact]
        public void FailureDetailsAndSuitePathReachTheTestCase()
        {
            Story.BeginTest();
            Story.Init("records a failure");
            Story.Given("a failing assertion");

            var error = new RawTestError { Message = "Assert.Equal() Failure", Stack = "at Thing.Method()" };
            Story.RecordAndClear("fail", error, ["CheckoutTests"]);

            RawTestCase recorded = Assert.Single(
                InProcessCollector.Snapshot(),
                tc => tc.Title == "records a failure");

            Assert.Equal("fail", recorded.Status);
            Assert.Equal("Assert.Equal() Failure", recorded.Error?.Message);
            Assert.Equal(["CheckoutTests", "records a failure"], recorded.TitlePath);
        }
    }
}
