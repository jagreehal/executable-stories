using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ExecutableStories.Xunit.Tests
{
    /// <summary>
    /// Covers what the adapter puts in the run file, and where it puts it.
    /// </summary>
    public class AdapterOutputTests : IDisposable
    {
        public AdapterOutputTests()
        {
            Story.Clear();
        }

        public void Dispose()
        {
            Story.Clear();
            GC.SuppressFinalize(this);
        }

        // A plan belongs to the class that declared it, so it groups with that
        // class's other scenarios rather than under a heading of its own.
        [Fact]
        public void PlannedScenarioKeepsTheClassThatDeclaredIt()
        {
            const string Scenario = "a plan keeps the class that declared it";

            Story.BeginTest();
            Story.Planned(Scenario);

            RawTestCase recorded = Recorded(Scenario);

            Assert.Equal("todo", recorded.Status);
            Assert.Equal(typeof(AdapterOutputTests).FullName, recorded.SourceFile);
            Assert.Equal(["AdapterOutputTests", Scenario], recorded.TitlePath);
        }

        // The body of an async method is a compiler-generated nested type, so a
        // class read off the stack alone would come back as Class+<Method>d__0.
        [Fact]
        public async Task PlannedScenarioKeepsItsClassAcrossAnAwait()
        {
            const string Scenario = "a plan survives an await";

            Story.BeginTest();
            await Task.Yield();
            Story.Planned(Scenario);

            RawTestCase recorded = Recorded(Scenario);

            Assert.Equal(typeof(AdapterOutputTests).FullName, recorded.SourceFile);
            Assert.Equal(["AdapterOutputTests", Scenario], recorded.TitlePath);
        }

        // Story.Feature reads the class off the stack with no test context to
        // fall back on, so the unwrapping has to hold on its own.
        [Fact]
        public void AnAsyncStateMachineResolvesToTheClassThatWroteIt()
        {
            Type stateMachine = typeof(AdapterOutputTests)
                .GetMethod(nameof(PlannedScenarioKeepsItsClassAcrossAnAwait))!
                .GetCustomAttribute<AsyncStateMachineAttribute>()!
                .StateMachineType;

            Assert.NotEqual(typeof(AdapterOutputTests), stateMachine);
            Assert.Equal(typeof(AdapterOutputTests), Story.AuthoredType(stateMachine));
        }

        [Fact]
        public void AnOrdinaryClassIsLeftAlone()
        {
            Assert.Equal(typeof(AdapterOutputTests), Story.AuthoredType(typeof(AdapterOutputTests)));
        }

        // Reading the process to the end first hands the timeout to the process
        // rather than the other way round, so a hung command holds up the whole
        // run.
        [Fact]
        public void ACommandThatOutrunsItsTimeoutIsGivenUpOn()
        {
            using Process process = Start("sleep", "30");
            var clock = Stopwatch.StartNew();

            var output = InProcessCollector.ReadCommandOutput(process, 1000);

            Assert.Null(output);
            Assert.True(clock.Elapsed < TimeSpan.FromSeconds(10), $"waited {clock.Elapsed}");
            // Kill only asks; a sleep still running after this was never killed.
            Assert.True(process.WaitForExit(5000), "the timed-out process was left running");
        }

        [Fact]
        public void ACommandThatFailsReportsNothing()
        {
            using Process process = Start("sh", "-c \"echo out; exit 3\"");

            Assert.Null(InProcessCollector.ReadCommandOutput(process, 5000));
        }

        [Fact]
        public void ACommandThatSucceedsReportsItsOutput()
        {
            using Process process = Start("sh", "-c \"echo deadbeef\"");

            Assert.Equal("deadbeef", InProcessCollector.ReadCommandOutput(process, 5000));
        }

        private static Process Start(string fileName, string arguments)
        {
            return Process.Start(new ProcessStartInfo(fileName, arguments)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            })!;
        }

        /// <summary>
        /// The one case the collector holds under this title.
        /// </summary>
        /// <remarks>
        /// The collector is process-wide and every test in the assembly records
        /// into it, so a title on its own is not an identity. Matching the class
        /// too keeps this from depending on what else ran first.
        /// </remarks>
        private static RawTestCase Recorded(string title)
        {
            return Assert.Single(
                InProcessCollector.Snapshot(),
                tc => tc.Title == title && tc.SourceFile == typeof(AdapterOutputTests).FullName);
        }

        [Fact]
        public void VideoIsAvailableAsADocKind()
        {
            Story.Init("a recorded journey");
            Story.Given("a browser session");
            _ = Story.Video("run.webm", caption: "Checkout", poster: "poster.png");

            var json = JsonSerializer.Serialize(Story.GetContext()!.ToStoryMeta());

            Assert.Contains("\"kind\":\"video\"", json);
            Assert.Contains("\"path\":\"run.webm\"", json);
            Assert.Contains("\"caption\":\"Checkout\"", json);
            Assert.Contains("\"poster\":\"poster.png\"", json);
        }

        // dotnet test runs the host out of bin/<config>/<tfm>, so the working
        // directory names build output rather than the project.
        [Fact]
        public void ProjectRootIsTheProjectDirectoryNotTheBuildOutput()
        {
            var root = InProcessCollector.ResolveProjectRoot();

            Assert.True(File.Exists(Path.Combine(root, "ExecutableStories.Xunit.Tests.csproj")),
                $"expected the project directory, got {root}");
        }

        [Fact]
        public void ProjectRootFallsBackWhenNoProjectFileIsAbove()
        {
            var dir = Directory.CreateTempSubdirectory("es-no-proj-").FullName;
            try
            {
                Assert.Null(InProcessCollector.FindProjectDirectory(dir));
            }
            finally
            {
                Directory.Delete(dir, recursive: true);
            }
        }

        [Fact]
        public void ProjectRootIsDeclaredEnvironmentWhenSet()
        {
            const string Key = "EXECUTABLE_STORIES_PROJECT_ROOT";
            var previous = Environment.GetEnvironmentVariable(Key);
            try
            {
                Environment.SetEnvironmentVariable(Key, "/somewhere/else");
                Assert.Equal("/somewhere/else", InProcessCollector.ResolveProjectRoot());
            }
            finally
            {
                Environment.SetEnvironmentVariable(Key, previous);
            }
        }

        // A write that fails leaves the last good report in place, and a reader
        // polling the file mid-run always parses it.
        [Fact]
        public void AFailedWriteLeavesThePreviousReportIntact()
        {
            var dir = Directory.CreateTempSubdirectory("es-atomic-").FullName;
            var path = Path.Combine(dir, "raw-run.json");
            try
            {
                RawRunWriter.Write(new RawRun { ProjectRoot = "first" }, path);

                // A doc entry holding something System.Text.Json cannot write.
                var broken = new RawRun
                {
                    ProjectRoot = "second",
                    TestCases =
                    [
                        new()
                        {
                            Title = "unserializable",
                            Story = new StoryMeta
                            {
                                Scenario = "unserializable",
                                Docs = [DocEntry.Kv("handle", new IntPtr(1))],
                            },
                        },
                    ],
                };
                _ = Assert.ThrowsAny<Exception>(() => RawRunWriter.Write(broken, path));

                RawRun? back = JsonSerializer.Deserialize<RawRun>(File.ReadAllText(path));
                Assert.Equal("first", back?.ProjectRoot);
                Assert.Equal(["raw-run.json"], Directory.GetFiles(dir).Select(Path.GetFileName));
            }
            finally
            {
                Directory.Delete(dir, recursive: true);
            }
        }

        // Removing the last story from a class that still has ordinary tests is
        // exactly what coveredSourceFiles reports, so the run is still written.
        [Fact]
        public void ARunThatReachedClassesButToldNoStoryIsStillWritten()
        {
            RawRun? run = InProcessCollector.BuildRun([], ["Acme.Tests.CheckoutTests"], "/project");

            Assert.NotNull(run);
            Assert.Empty(run.TestCases);
            Assert.Equal(["Acme.Tests.CheckoutTests"], run.CoveredSourceFiles);
        }

        [Fact]
        public void AProcessThatNeverReachedTheAdapterWritesNothing()
        {
            Assert.Null(InProcessCollector.BuildRun([], [], "/project"));
        }

        [Fact]
        public void DefaultOutputPathSitsUnderTheProjectRoot()
        {
            Assert.Equal(
                Path.Combine("/project", ".executable-stories", "raw-run.json"),
                InProcessCollector.ResolveOutputPath("/project", null));
        }

        // Anchored to the project root, the same directory the default uses.
        [Fact]
        public void ARelativeOutputOverrideResolvesAgainstTheProjectRoot()
        {
            Assert.Equal(
                Path.Combine("/project", "reports/raw-run.json"),
                InProcessCollector.ResolveOutputPath("/project", "reports/raw-run.json"));
        }

        [Fact]
        public void AnAbsoluteOutputOverrideIsTakenAsGiven()
        {
            var absolute = Path.Combine(Path.GetTempPath(), "es-run.json");

            Assert.Equal(absolute, InProcessCollector.ResolveOutputPath("/project", absolute));
        }

        [Fact]
        public void CoveredClassesAreDeduplicatedAndIgnoreBlanks()
        {
            InProcessCollector.MarkCovered("Acme.Tests.CheckoutTests");
            InProcessCollector.MarkCovered("Acme.Tests.CheckoutTests");
            InProcessCollector.MarkCovered(null);
            InProcessCollector.MarkCovered("");

            IReadOnlyList<string> covered = InProcessCollector.CoveredSnapshot();

            _ = Assert.Single(covered, name => name == "Acme.Tests.CheckoutTests");
            Assert.DoesNotContain("", covered);
        }
    }
}
