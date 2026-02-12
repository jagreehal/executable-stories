namespace ExecutableStories.Xunit;

/// <summary>
/// In-process collector for when tests run under dotnet test (VSTest does not use IRunnerReporter).
/// Record via <see cref="Story.RecordAndClear"/>. Written on process exit.
/// </summary>
internal static class InProcessCollector
{
    private static readonly List<RawTestCase> _list = new();
    private static long _startedAtMs;
    private static bool _startedSet;

    static InProcessCollector()
    {
        AppDomain.CurrentDomain.ProcessExit += (_, _) => WriteIfAny();
    }

    public static void Record(RawTestCase testCase)
    {
        if (!_startedSet)
        {
            _startedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _startedSet = true;
        }
        lock (_list)
        {
            _list.Add(testCase);
        }
    }

    private static void WriteIfAny()
    {
        List<RawTestCase> copy;
        lock (_list)
        {
            if (_list.Count == 0) return;
            copy = new List<RawTestCase>(_list);
        }

        var run = new RawRun
        {
            SchemaVersion = 1,
            TestCases = copy,
            StartedAtMs = _startedAtMs > 0 ? _startedAtMs : null,
            FinishedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ProjectRoot = Directory.GetCurrentDirectory(),
            Ci = CIDetector.ToRawCIInfo(CIDetector.Detect())
        };

        var outputPath = Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_OUTPUT")
            ?? Path.Combine(Directory.GetCurrentDirectory(), ".executable-stories", "raw-run.json");

        RawRunWriter.Write(run, outputPath);
    }
}
