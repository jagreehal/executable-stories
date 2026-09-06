using System.Reflection;
using Xunit;
using Xunit.v3;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Records the story a test created, using the outcome xUnit already knows.
    /// </summary>
    /// <remarks>
    /// Apply once at assembly level and every test in the assembly is covered:
    /// <code>
    /// [assembly: ExecutableStories.Xunit.StoryRecording]
    /// </code>
    /// It can also go on a class or a method when you want narrower scope.
    /// <para>
    /// Without it, each test has to call <see cref="Story.RecordAndClear(string)"/>
    /// itself, and a failing test throws before reaching that call.
    /// </para>
    /// </remarks>
    [AttributeUsage(AttributeTargets.Assembly | AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
    public sealed class StoryRecordingAttribute : BeforeAfterTestAttribute
    {
        /// <inheritdoc />
        public override void Before(MethodInfo methodUnderTest, IXunitTest test)
        {
            Story.BeginTest();
        }

        /// <inheritdoc />
        public override void After(MethodInfo methodUnderTest, IXunitTest test)
        {
            var sourceKey = SourceKey(test);

            // Every test that ran, not only the ones that told a story.
            InProcessCollector.MarkCovered(sourceKey);

            TestResultState? state = TestContext.Current.TestState;
            var status = state?.Result switch
            {
                TestResult.Passed => "pass",
                TestResult.Failed => "fail",
                TestResult.Skipped => "skip",
                TestResult.NotRun => "skip",
                _ => "pass",
            };

            Story.RecordAndClear(status, ErrorFrom(state), Story.SuitePathFor(sourceKey), sourceKey);
        }

        private static RawTestError? ErrorFrom(TestResultState? state)
        {
            if (state?.Result != TestResult.Failed)
            {
                return null;
            }

            var message = First(state.ExceptionMessages);
            var type = First(state.ExceptionTypes);
            return new RawTestError
            {
                Message = type is null ? message : $"{type}: {message}",
                Stack = First(state.ExceptionStackTraces),
            };
        }

        private static string? First(string?[]? values)
        {
            return values is { Length: > 0 } ? values[0] : null;
        }

        /// <summary>
        /// Key the report groups by, matching what <see cref="Story.Feature"/> records.
        /// </summary>
        private static string? SourceKey(IXunitTest test)
        {
            return test.TestCase.TestMethod?.TestClass.TestClassName;
        }
    }
}
