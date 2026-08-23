namespace ExecutableStories.Xunit
{
    /// <summary>
    /// In-process collector for when tests run under dotnet test (VSTest does not use IRunnerReporter).
    /// Record via <see cref="Story.RecordAndClear(string)"/>. Written on process exit.
    /// </summary>
    internal static class InProcessCollector
    {
        private static readonly List<RawTestCase> _list = [];
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

        /// <summary>
        /// Copy of what has been recorded so far. Tests only.
        /// </summary>
        internal static IReadOnlyList<RawTestCase> Snapshot()
        {
            lock (_list)
            {
                return [.. _list];
            }
        }

        private static void WriteIfAny()
        {
            List<RawTestCase> copy;
            lock (_list)
            {
                if (_list.Count == 0)
                {
                    return;
                }

                copy = new List<RawTestCase>(_list);
            }

            var run = new RawRun
            {
                Schema = RawRun.SchemaUrl,
                SchemaVersion = 1,
                TestCases = copy,
                Features = Story.DeclaredFeatures(),
                StartedAtMs = _startedAtMs > 0 ? _startedAtMs : null,
                FinishedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                ProjectRoot = Directory.GetCurrentDirectory(),
                Ci = CIDetector.ToRawCIInfo(CIDetector.Detect())
            };

            var outputPath = Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_OUTPUT")
                ?? Path.Combine(Directory.GetCurrentDirectory(), ".executable-stories", "raw-run.json");

            RawRunWriter.Write(run, outputPath);
            PrintNextStep(outputPath);
        }

        /// <summary>
        /// Tell the user how to turn the run JSON into a report.
        /// </summary>
        /// <remarks>
        /// The JS adapters render reports in-process, so their users never need to
        /// know the CLI exists. xUnit hands off to the CLI instead, so without this
        /// the run ends with a file and no indication of what to do with it. stderr
        /// keeps piped output clean; EXECUTABLE_STORIES_QUIET silences it in CI.
        /// </remarks>
        private static void PrintNextStep(string outputPath)
        {
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_QUIET")))
            {
                return;
            }

            Console.Error.WriteLine($"\nexecutable-stories: wrote {outputPath}");
            Console.Error.WriteLine($"  next: executable-stories format {outputPath} --format html");
        }
    }
}
