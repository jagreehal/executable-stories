namespace ExecutableStories.Xunit.Tests
{
    /// <summary>
    /// The step checklist <see cref="StoryRecordingAttribute"/> writes to a failed
    /// test's output, so a red run shows how far the story got.
    /// </summary>
    public class StepTrailTests
    {
        [Fact]
        public void MarkerStepsMarkTheLastClaim()
        {
            Story.BeginTest();
            Story.Init("marker");
            Story.Given("a balance of 50");
            Story.Then("the balance is 150");

            Assert.Equal("Story steps:\n  ✓ Given a balance of 50\n  ✗ Then the balance is 150", Story.StepTrail());
        }

        [Fact]
        public void AWrappedBodyThatThrowsIsTheFailingStep()
        {
            Story.BeginTest();
            Story.Init("wrapped");
            Story.Fn("Given", "setup", () => { });
            _ = Assert.Throws<InvalidOperationException>(() =>
                Story.Fn("When", "it breaks", () => throw new InvalidOperationException("kaput")));

            Assert.Equal("Story steps:\n  ✓ Given setup\n  ✗ When it breaks", Story.StepTrail());
        }

        [Fact]
        public void ACaughtThrowDoesNotOwnALaterFailure()
        {
            Story.BeginTest();
            Story.Init("caught");
            _ = Assert.Throws<InvalidOperationException>(() =>
                Story.Fn("Given", "a rejected input", () => throw new InvalidOperationException("rejected")));
            Story.Then("the total is 3");

            Assert.Equal("Story steps:\n  ✓ Given a rejected input\n  ✗ Then the total is 3", Story.StepTrail());
        }

        [Fact]
        public void NestedStepsMarkTheInnerOneThatThrew()
        {
            Story.BeginTest();
            Story.Init("nested");
            _ = Assert.Throws<InvalidOperationException>(() =>
                Story.Fn("When", "the order is placed", () =>
                    Story.Fn("And", "payment is taken", () => throw new InvalidOperationException("declined"))));

            Assert.Equal("Story steps:\n  ✓ When the order is placed\n  ✗ And payment is taken", Story.StepTrail());
        }

        [Fact]
        public void AFailureAfterAFinishedWrappedStepSaysSo()
        {
            Story.BeginTest();
            Story.Init("after");
            Story.Fn("Given", "setup", () => { });

            Assert.Equal("Story steps:\n  ✓ Given setup\n  ✗ (failed after the last step)", Story.StepTrail());
        }

        [Fact]
        public void NoStoryNoTrail()
        {
            Story.BeginTest();

            Assert.Equal("", Story.StepTrail());
        }
    }
}
