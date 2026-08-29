namespace ExecutableStories.Xunit.Tests
{
    /// <summary>
    /// A run narrowed by test name reports only the matching tests, so it is not
    /// the complete contents of the classes it touches.
    ///
    /// <c>dotnet test --filter</c> is applied by the test host before the adapter
    /// runs and is not visible in process, so the narrowing is declared through
    /// EXECUTABLE_STORIES_FILTERED rather than detected.
    /// </summary>
    public class NameFilterTests
    {
        [Fact]
        public void RunWithNoSignalHasUnknownScope()
        {
            // dotnet test --filter is invisible here, so claiming full coverage
            // would be a guess that could delete scenarios.
            Assert.Null(InProcessCollector.ResolveRunScope(null));
            Assert.Null(InProcessCollector.ResolveRunScope(""));
            Assert.Null(InProcessCollector.ResolveRunScope("   "));
        }

        [Fact]
        public void EnvironmentOverrideStatesANarrowedRun()
        {
            Assert.Equal("filtered", InProcessCollector.ResolveRunScope("1"));
            Assert.Equal("filtered", InProcessCollector.ResolveRunScope("true"));
        }

        [Fact]
        public void EnvironmentOverrideCanStateACompleteRun()
        {
            Assert.Equal("full", InProcessCollector.ResolveRunScope("0"));
            Assert.Equal("full", InProcessCollector.ResolveRunScope("false"));
            Assert.Equal("full", InProcessCollector.ResolveRunScope("FALSE"));
        }

        [Fact]
        public void ScopeIsOmittedFromJsonWhenUnknown()
        {
            var json = System.Text.Json.JsonSerializer.Serialize(new RawRun());
            Assert.DoesNotContain("runScope", json);
        }

        [Fact]
        public void ScopeIsSerializedWhenKnown()
        {
            var json = System.Text.Json.JsonSerializer.Serialize(new RawRun { RunScope = "filtered" });
            Assert.Contains("\"runScope\":\"filtered\"", json);
        }
    }
}
