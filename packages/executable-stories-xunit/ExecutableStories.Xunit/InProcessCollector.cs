using System.Diagnostics;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// In-process collector for when tests run under dotnet test (VSTest does not use IRunnerReporter).
    /// Record via <see cref="Story.RecordAndClear(string)"/>. Written on process exit.
    /// </summary>
    internal static class InProcessCollector
    {
        private const int GitTimeoutMs = 5000;

        private static readonly List<RawTestCase> _list = [];
        private static readonly SortedSet<string> _covered = [];
        private static long _startedAtMs;

        static InProcessCollector()
        {
            AppDomain.CurrentDomain.ProcessExit += (_, _) => WriteIfAny();
        }

        public static void Record(RawTestCase testCase)
        {
            MarkStarted();
            lock (_list)
            {
                _list.Add(testCase);
            }
        }

        /// <summary>
        /// Stamp the run's start, the first time anything reaches the collector.
        /// </summary>
        private static void MarkStarted()
        {
            // Writes only while the stamp is still zero, so the two entry points
            // racing each other cannot move the start of the run.
            _ = Interlocked.CompareExchange(
                ref _startedAtMs, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 0);
        }

        /// <summary>
        /// Note that a test class ran, whether or not it told a story.
        /// </summary>
        /// <remarks>
        /// Test cases only name the classes that produced something, so without
        /// this a class whose last scenario was deleted looks exactly like one
        /// that did not run this time, and its scenarios live on in the docs for
        /// good. Only a run that also declares full scope acts on it.
        /// </remarks>
        public static void MarkCovered(string? sourceKey)
        {
            if (string.IsNullOrEmpty(sourceKey))
            {
                return;
            }

            MarkStarted();
            lock (_covered)
            {
                _ = _covered.Add(sourceKey);
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

        /// <summary>
        /// Copy of the classes seen so far. Tests only.
        /// </summary>
        internal static IReadOnlyList<string> CoveredSnapshot()
        {
            lock (_covered)
            {
                return [.. _covered];
            }
        }

        private static void WriteIfAny()
        {
            List<RawTestCase> testCases;
            lock (_list)
            {
                testCases = [.. _list];
            }

            List<string> covered;
            lock (_covered)
            {
                covered = [.. _covered];
            }

            var projectRoot = ResolveProjectRoot();
            RawRun? run = BuildRun(testCases, covered, projectRoot);
            if (run == null)
            {
                return;
            }

            var outputPath = ResolveOutputPath(
                projectRoot, Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_OUTPUT"));

            RawRunWriter.Write(run, outputPath);
            PrintNextStep(outputPath);
        }

        /// <summary>
        /// The run to write, or null when this process has nothing to report.
        /// </summary>
        /// <remarks>
        /// A run that reached classes but produced no scenario is still worth
        /// writing: removing the last story from a class while its ordinary
        /// tests stay put is exactly the case <c>coveredSourceFiles</c> exists
        /// to report, and skipping the write leaves the deleted scenarios in
        /// the docs however complete the run declares itself to be.
        /// </remarks>
        internal static RawRun? BuildRun(
            List<RawTestCase> testCases, List<string> covered, string projectRoot)
        {
            return testCases.Count == 0 && covered.Count == 0
                ? null
                : new RawRun
                {
                    Schema = RawRun.SchemaUrl,
                    SchemaVersion = 1,
                    TestCases = testCases,
                    Features = Story.DeclaredFeatures(),
                    CoveredSourceFiles = covered.Count > 0 ? covered : null,
                    StartedAtMs = _startedAtMs > 0 ? _startedAtMs : null,
                    FinishedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    ProjectRoot = projectRoot,
                    GitSha = ResolveGitSha(projectRoot),
                    Ci = CIDetector.ToRawCIInfo(CIDetector.Detect()),
                    RunScope = ResolveRunScope(
                        Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_FILTERED"))
                };
        }

        /// <summary>
        /// Where to write the run, given the project root and any declared override.
        /// </summary>
        /// <remarks>
        /// A relative override resolves against the project root, not the
        /// working directory, for the same reason the default does: under
        /// <c>dotnet test</c> the working directory is <c>bin/&lt;config&gt;/&lt;tfm&gt;</c>,
        /// so resolving there buries the file exactly where the caller was
        /// trying to move it out of. An absolute path is taken as given.
        /// </remarks>
        internal static string ResolveOutputPath(string projectRoot, string? declaredOutput)
        {
            return string.IsNullOrWhiteSpace(declaredOutput)
                ? Path.Combine(projectRoot, ".executable-stories", "raw-run.json")
                : Path.Combine(projectRoot, declaredOutput);
        }

        /// <summary>
        /// Directory the test project lives in, not the one it was built into.
        /// </summary>
        /// <remarks>
        /// <c>dotnet test</c> runs the test host out of <c>bin/&lt;config&gt;/&lt;tfm&gt;</c>,
        /// so the working directory names build output. Reporting that as the
        /// project root buries the run JSON under <c>bin/</c> and resolves every
        /// relative path in the report against the wrong directory. The project
        /// file that produced the assembly is the nearest honest answer, so walk
        /// up to it; EXECUTABLE_STORIES_PROJECT_ROOT covers a layout that puts
        /// output somewhere else entirely.
        /// </remarks>
        internal static string ResolveProjectRoot()
        {
            var declared = Environment.GetEnvironmentVariable("EXECUTABLE_STORIES_PROJECT_ROOT");
            return !string.IsNullOrWhiteSpace(declared)
                ? declared
                : FindProjectDirectory(AppContext.BaseDirectory) ?? Directory.GetCurrentDirectory();
        }

        /// <summary>
        /// Nearest ancestor of <paramref name="start"/> holding a project file, or null.
        /// </summary>
        internal static string? FindProjectDirectory(string start)
        {
            for (DirectoryInfo? dir = new(start); dir != null; dir = dir.Parent)
            {
                // "*.*proj" covers csproj, fsproj and vbproj without three passes.
                if (dir.EnumerateFiles("*.*proj").Any())
                {
                    return dir.FullName;
                }
            }

            return null;
        }

        /// <summary>
        /// Commit the report describes, or null when that cannot be established.
        /// </summary>
        /// <remarks>
        /// CI hands the SHA over directly and is checked first, since a shallow
        /// or detached checkout can make git the less reliable of the two. Git
        /// resolves HEAD and packed-refs correctly, so shelling out to it beats
        /// reimplementing that here.
        /// </remarks>
        internal static string? ResolveGitSha(string workingDirectory)
        {
            foreach (var key in new[] { "GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA" })
            {
                var sha = Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrWhiteSpace(sha))
                {
                    return sha.Trim();
                }
            }

            try
            {
                using var git = Process.Start(new ProcessStartInfo("git", "rev-parse HEAD")
                {
                    WorkingDirectory = workingDirectory,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                });
                return git == null ? null : ReadCommandOutput(git, GitTimeoutMs);
            }
            catch
            {
                // No git on PATH, or not a repository. The field is optional.
                return null;
            }
        }

        /// <summary>
        /// What <paramref name="process"/> wrote to stdout, or null if it failed
        /// or outran <paramref name="timeoutMs"/>.
        /// </summary>
        /// <remarks>
        /// The wait comes first: reading to the end before it hands the timeout
        /// to the process rather than the other way round. Reading afterwards is
        /// safe for output this small, which the pipe buffers long before anyone
        /// asks.
        /// </remarks>
        internal static string? ReadCommandOutput(Process process, int timeoutMs)
        {
            // Nothing reads stderr otherwise, and an unread pipe that fills is a
            // process that never exits.
            process.ErrorDataReceived += (_, _) => { };
            process.BeginErrorReadLine();

            if (!process.WaitForExit(timeoutMs))
            {
                process.Kill(entireProcessTree: true);
                return null;
            }

            if (process.ExitCode != 0)
            {
                return null;
            }

            var output = process.StandardOutput.ReadToEnd().Trim();
            return output.Length > 0 ? output : null;
        }

        /// <summary>
        /// How much of each source file this run covered, or null when that
        /// cannot be determined.
        /// </summary>
        /// <remarks>
        /// <c>dotnet test --filter</c> is applied by the test host before the
        /// adapter sees anything, and xUnit does not surface it in process, so
        /// unlike the Vitest, Jest and Playwright adapters this cannot be
        /// detected. Null means unknown, and a consumer keeps what an
        /// unknown-scope run did not report rather than retiring it on a guess;
        /// EXECUTABLE_STORIES_FILTERED lets a wrapper state what it knows.
        /// </remarks>
        internal static string? ResolveRunScope(string? filteredEnv)
        {
            var value = filteredEnv?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(value))
            {
                return null;
            }

            // Explicit either way: an operator saying "0" states a complete run.
            return value is "0" or "false" ? "full" : "filtered";
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
