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
            TestResultState? state = TestContext.Current.TestState;
            var status = state?.Result switch
            {
                TestResult.Passed => "pass",
                TestResult.Failed => "fail",
                TestResult.Skipped => "skip",
                TestResult.NotRun => "skip",
                _ => "pass",
            };

            Story.RecordAndClear(status, ErrorFrom(state), SuitePath(test), SourceKey(test));
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

        private static IReadOnlyList<string>? SuitePath(IXunitTest test)
        {
            var className = test.TestCase.TestMethod?.TestClass.TestClassName;
            if (string.IsNullOrEmpty(className))
            {
                return null;
            }

            // The class name arrives fully qualified. Report headings read better
            // with just the class, the way a describe block reads in Vitest.
            var lastDot = className.LastIndexOf('.');
            return [lastDot < 0 ? className : className[(lastDot + 1)..]];
        }
    }
}
