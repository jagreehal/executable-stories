using System.Collections.Concurrent;
using System.Diagnostics;
using Xunit;
using Xunit.Abstractions;

namespace ExecutableStories.Xunit;

/// <summary>
/// Message sink that captures xUnit test lifecycle events and collects
/// Story context data to emit RawRun JSON at the end of the test assembly.
/// Implements <see cref="IMessageSinkWithTypes"/> from xunit.runner.utility.
/// </summary>
public class StoryMessageSink : IMessageSinkWithTypes, IMessageSink
{
    private static readonly ConcurrentBag<RawTestCase> _testCases = new();
    private static long _startTimeMs;
    private static readonly ConcurrentDictionary<string, long> _testStartTicks = new();

    /// <inheritdoc />
    public bool OnMessage(IMessageSinkMessage message)
    {
        // Delegate to OnMessageWithTypes by extracting implemented interface names
        var messageTypes = new HashSet<string>(
            message.GetType().GetInterfaces().Select(i => i.FullName!));
        return OnMessageWithTypes(message, messageTypes);
    }

    public bool OnMessageWithTypes(IMessageSinkMessage message, HashSet<string> messageTypes)
    {
        if (messageTypes.Contains("Xunit.Abstractions.ITestAssemblyStarting"))
        {
            _startTimeMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
        else if (messageTypes.Contains("Xunit.Abstractions.ITestStarting"))
        {
            var starting = (ITestStarting)message;
            var id = starting.Test?.TestCase?.UniqueID;
            if (!string.IsNullOrEmpty(id))
            {
                _testStartTicks[id] = Stopwatch.GetTimestamp();
            }
        }
        else if (messageTypes.Contains("Xunit.Abstractions.ITestPassed"))
        {
            var passed = (ITestPassed)message;
            CaptureTestCase(passed.Test, "pass", passed.ExecutionTime, null, null);
        }
        else if (messageTypes.Contains("Xunit.Abstractions.ITestFailed"))
        {
            var failed = (ITestFailed)message;
            var errorMessage = failed.Messages?.Length > 0 ? string.Join(Environment.NewLine, failed.Messages) : null;
            var errorStack = failed.StackTraces?.Length > 0 ? string.Join(Environment.NewLine, failed.StackTraces) : null;
            CaptureTestCase(failed.Test, "fail", failed.ExecutionTime, errorMessage, errorStack);
        }
        else if (messageTypes.Contains("Xunit.Abstractions.ITestSkipped"))
        {
            var skipped = (ITestSkipped)message;
            CaptureTestCase(skipped.Test, "skip", 0, skipped.Reason, null);
        }
        else if (messageTypes.Contains("Xunit.Abstractions.ITestAssemblyFinished"))
        {
            WriteOutput();
        }

        return true;
    }

    /// <inheritdoc />
    public void Dispose()
    {
        // No resources to clean up
    }

    private static void CaptureTestCase(ITest test, string status, decimal executionTime, string? errorMessage, string? errorStack)
    {
        var storyContext = Story.GetContext();
        var attachments = storyContext?.GetAttachments();
        // Build stepEvents from steps with durationMs
        List<Dictionary<string, object>>? stepEvents = null;
        if (storyContext is { Steps.Count: > 0 })
        {
            var list = storyContext.Steps
                .Select((step, index) => new { step, index })
                .Where(x => x.step.DurationMs.HasValue)
                .Select(x => new Dictionary<string, object>
                {
                    ["index"] = x.index,
                    ["title"] = x.step.Text,
                    ["durationMs"] = x.step.DurationMs!.Value
                })
                .ToList();
            if (list.Count > 0)
            {
                stepEvents = list;
            }
        }

        // Prefer actual per-test stopwatch duration if available; otherwise fall back to executionTime.
        double durationMs;
        var uniqueId = test.TestCase?.UniqueID;
        if (!string.IsNullOrEmpty(uniqueId) && _testStartTicks.TryRemove(uniqueId, out var startTicks))
        {
            durationMs = Stopwatch.GetElapsedTime(startTicks).TotalMilliseconds;
        }
        else
        {
            durationMs = (double)(executionTime * 1000m);
        }

        var testCase = new RawTestCase
        {
            ExternalId = test.TestCase?.UniqueID,
            Title = test.DisplayName,
            TitlePath = BuildTitlePath(test),
            Status = status,
            DurationMs = durationMs,
            Story = storyContext?.ToStoryMeta(),
            Retry = 0,
            Retries = 0,
            Attachments = attachments is { Count: > 0 } ? attachments : null,
            StepEvents = stepEvents
        };

        if (errorMessage != null || errorStack != null)
        {
            testCase.Error = new RawTestError
            {
                Message = errorMessage,
                Stack = errorStack
            };
        }

        // Extract source info if available
        if (test.TestCase?.SourceInformation != null)
        {
            testCase.SourceFile = test.TestCase.SourceInformation.FileName;
            testCase.SourceLine = test.TestCase.SourceInformation.LineNumber;
        }

        _testCases.Add(testCase);

        // Clear the story context for the next test
        Story.Clear();
    }

    private static List<string>? BuildTitlePath(ITest test)
    {
        var parts = new List<string>();

        var testClass = test.TestCase?.TestMethod?.TestClass?.Class?.Name;
        if (testClass != null)
        {
            // Use only the class name, not the full namespace
            var lastDot = testClass.LastIndexOf('.');
            parts.Add(lastDot >= 0 ? testClass[(lastDot + 1)..] : testClass);
        }

        var testMethod = test.TestCase?.TestMethod?.Method?.Name;
        if (testMethod != null)
        {
            parts.Add(testMethod);
        }

        return parts.Count > 0 ? parts : null;
    }

    private static void WriteOutput()
    {
        var finishedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var run = new RawRun
        {
            SchemaVersion = 1,
            TestCases = _testCases.ToList(),
            StartedAtMs = _startTimeMs > 0 ? _startTimeMs : null,
            FinishedAtMs = finishedAtMs,
            ProjectRoot = Directory.GetCurrentDirectory(),
            Ci = CIDetector.ToRawCIInfo(CIDetector.Detect())
        };

        // Default output path, can be overridden via environment variable
        var outputPath = Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_OUTPUT")
            ?? Path.Combine(Directory.GetCurrentDirectory(), ".executable-stories", "raw-run.json");

        RawRunWriter.Write(run, outputPath);

        // Clear for next run
        _testCases.Clear();
    }
}
