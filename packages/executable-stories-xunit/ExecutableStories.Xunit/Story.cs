using System.Diagnostics;
using System.Runtime.CompilerServices;
using Xunit;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Static fluent API for defining BDD stories within xUnit tests.
    /// Uses AsyncLocal to maintain per-test context in concurrent scenarios.
    /// </summary>
    public static class Story
    {
        // A mutable holder rather than AsyncLocal<StoryContext?> directly: xUnit
        // runs the test body in its own ExecutionContext, so a context assigned
        // inside the test would not be visible to StoryRecordingAttribute.After.
        // The holder reference flows down into the test and mutating its field
        // is visible on the way back out.
        private sealed class ContextHolder
        {
            public StoryContext? Context { get; set; }
        }

        private static readonly AsyncLocal<ContextHolder?> _holder = new();

        // Declarations keyed by the class that made them, so a re-declaration
        // reads the way it does in source order.
        private static readonly Dictionary<string, RawFeature> _features = [];

        private static ContextHolder Holder()
        {
            ContextHolder? holder = _holder.Value;
            if (holder == null)
            {
                holder = new ContextHolder();
                _holder.Value = holder;
            }

            return holder;
        }

        /// <summary>
        /// Declare what a class's scenarios are for, ahead of the examples.
        /// </summary>
        /// <remarks>
        /// Scenarios say what the system does. A declaration says why the feature
        /// exists and who it serves, so a reader meets the intent before the
        /// examples. Call it once per test class, from a static constructor:
        /// <code>
        /// static CheckoutTests() => Story.Feature(
        ///     "Shoppers can check out without an account",
        ///     kind: "ability",
        ///     narrative: "Forcing a signup before payment is where carts get abandoned.");
        /// </code>
        /// .NET gives us no source path, so the declaring class is the key the
        /// report groups by, taken from the call stack.
        /// </remarks>
        /// <param name="title">Heading for the feature.</param>
        /// <param name="kind">"feature" (default), "ability", or "business-need".</param>
        /// <param name="narrative">Markdown explaining why the feature exists.</param>
        /// <param name="tags">Tags applied to every scenario in the class.</param>
        /// <param name="glossary">Terms this feature defines, term to definition.</param>
        public static void Feature(
            string title,
            string? kind = null,
            string? narrative = null,
            IEnumerable<string>? tags = null,
            IReadOnlyDictionary<string, string>? glossary = null)
        {
            var key = DeclaringClassName();
            if (key == null)
            {
                return;
            }

            var declared = new RawFeature
            {
                SourceFile = key,
                Title = title,
                Kind = kind,
                Narrative = narrative,
                Tags = tags?.ToList(),
                Glossary = glossary?
                    .Select(pair => new RawGlossaryTerm { Term = pair.Key, Definition = pair.Value })
                    .ToList(),
            };

            lock (_features)
            {
                _features[key] = declared;
            }
        }

        internal static List<RawFeature>? DeclaredFeatures()
        {
            lock (_features)
            {
                return _features.Count > 0 ? [.. _features.Values] : null;
            }
        }

        /// <summary>
        /// Class that called into this type, so a declaration keys to the test class.
        /// </summary>
        private static string? DeclaringClassName()
        {
            var trace = new StackTrace(false);
            for (var i = 0; i < trace.FrameCount; i++)
            {
                Type? declaring = trace.GetFrame(i)?.GetMethod()?.DeclaringType;
                if (declaring != null && declaring != typeof(Story))
                {
                    return AuthoredType(declaring).FullName;
                }
            }

            return null;
        }

        /// <summary>
        /// The type someone wrote, given a type the compiler may have generated.
        /// </summary>
        /// <remarks>
        /// An async method body and a lambda each compile to a nested type of
        /// their own, so a frame inside one names <c>Checkout+&lt;Plan&gt;d__0</c>
        /// rather than <c>Checkout</c> — a key matching neither the class's
        /// feature declaration nor its covered-class entry. The class is the
        /// enclosing type, however many levels up.
        /// </remarks>
        internal static Type AuthoredType(Type type)
        {
            Type authored = type;
            while (authored.DeclaringType != null
                && authored.IsDefined(typeof(CompilerGeneratedAttribute), inherit: false))
            {
                authored = authored.DeclaringType;
            }

            return authored;
        }

        /// <summary>
        /// The test class xUnit is currently running, or null outside a test.
        /// </summary>
        private static string? CurrentTestClassName()
        {
            try
            {
                return TestContext.Current.Test?.TestCase.TestMethod?.TestClass.TestClassName;
            }
            catch
            {
                // No ambient test context: a hand-driven setup, or another host.
                return null;
            }
        }

        /// <summary>
        /// Open a slot for the story a test is about to create.
        /// </summary>
        /// <remarks>
        /// <see cref="StoryRecordingAttribute"/> calls this before the test body
        /// so the story survives back out to the recording hook. Calling it
        /// directly is only needed when driving the adapter by hand.
        /// </remarks>
        public static void BeginTest()
        {
            _holder.Value = new ContextHolder();
        }

        /// <summary>
        /// Initialize a new story for the current test.
        /// </summary>
        /// <param name="scenario">The scenario title.</param>
        /// <param name="tags">Optional tags for categorization.</param>
        public static void Init(string scenario, params string[] tags)
        {
            var ctx = new StoryContext(scenario, tags);
            Holder().Context = ctx;
            BridgeOtel(ctx);
        }

        /// <summary>
        /// Declare a scenario that is specified but not built yet. It is recorded
        /// immediately with status "todo", appears in the report marked "planned",
        /// and stops being planned once someone writes it as a real story with
        /// <see cref="Init"/>.
        /// </summary>
        /// <example>
        /// <code>
        /// [Fact]
        /// public void CheckoutIsBlockedForASuspendedAccount()
        /// {
        ///     Story.Planned("checkout is blocked for a suspended account");
        /// }
        /// </code>
        /// </example>
        /// <remarks>
        /// Skip = "..." means "do not run this now", which is a different claim
        /// from "we have not built this yet", so this does not skip the test.
        /// <para>
        /// The scenario is recorded immediately, so keep this the only statement
        /// in the test: an assertion failure afterwards cannot revise a record
        /// already written.
        /// </para>
        /// </remarks>
        /// <param name="scenario">The scenario title.</param>
        /// <param name="tags">Optional tags for categorization.</param>
        public static void Planned(string scenario, params string[] tags)
        {
            Holder().Context = new StoryContext(scenario, tags);

            // Recording here leaves the recording hook nothing to attribute, so
            // the class comes from xUnit directly — the same answer that hook
            // gives every other scenario, so the plan groups with them. The
            // stack is the fallback outside a test context.
            var key = CurrentTestClassName() ?? DeclaringClassName();
            RecordAndClear("todo", null, SuitePathFor(key), key);
        }

        // ========================================================================
        // BDD Step Markers
        // ========================================================================

        public static void Given(string text)
        {
            AddStep("Given", text);
        }

        public static void When(string text)
        {
            AddStep("When", text);
        }

        public static void Then(string text)
        {
            AddStep("Then", text);
        }

        public static void And(string text)
        {
            AddStep("And", text);
        }

        public static void But(string text)
        {
            AddStep("But", text);
        }

        public static void Given(string text, params DocEntry[] docs)
        {
            AddStep("Given", text, docs);
        }

        public static void When(string text, params DocEntry[] docs)
        {
            AddStep("When", text, docs);
        }

        public static void Then(string text, params DocEntry[] docs)
        {
            AddStep("Then", text, docs);
        }

        public static void And(string text, params DocEntry[] docs)
        {
            AddStep("And", text, docs);
        }

        public static void But(string text, params DocEntry[] docs)
        {
            AddStep("But", text, docs);
        }

        // ========================================================================
        // AAA Pattern Aliases
        // ========================================================================

        /// <summary>Add an Arrange step (alias for Given).</summary>
        public static void Arrange(string text)
        {
            AddStep("Given", text);
        }

        public static void Arrange(string text, params DocEntry[] docs)
        {
            AddStep("Given", text, docs);
        }

        /// <summary>Add an Act step (alias for When).</summary>
        public static void Act(string text)
        {
            AddStep("When", text);
        }

        public static void Act(string text, params DocEntry[] docs)
        {
            AddStep("When", text, docs);
        }

        /// <summary>Add an Assert step (alias for Then).</summary>
        public static void Assert(string text)
        {
            AddStep("Then", text);
        }

        public static void Assert(string text, params DocEntry[] docs)
        {
            AddStep("Then", text, docs);
        }

        // ========================================================================
        // Additional Aliases
        // ========================================================================

        /// <summary>Add a Setup step (alias for Given).</summary>
        public static void Setup(string text)
        {
            AddStep("Given", text);
        }

        public static void Setup(string text, params DocEntry[] docs)
        {
            AddStep("Given", text, docs);
        }

        /// <summary>Add a Context step (alias for Given).</summary>
        public static void Context(string text)
        {
            AddStep("Given", text);
        }

        public static void Context(string text, params DocEntry[] docs)
        {
            AddStep("Given", text, docs);
        }

        /// <summary>Add an Execute step (alias for When).</summary>
        public static void Execute(string text)
        {
            AddStep("When", text);
        }

        public static void Execute(string text, params DocEntry[] docs)
        {
            AddStep("When", text, docs);
        }

        /// <summary>Add an Action step (alias for When).</summary>
        public static void Action(string text)
        {
            AddStep("When", text);
        }

        public static void Action(string text, params DocEntry[] docs)
        {
            AddStep("When", text, docs);
        }

        /// <summary>Add a Verify step (alias for Then).</summary>
        public static void Verify(string text)
        {
            AddStep("Then", text);
        }

        public static void Verify(string text, params DocEntry[] docs)
        {
            AddStep("Then", text, docs);
        }

        // ========================================================================
        // Documentation Methods
        // ========================================================================

        /// <summary>
        /// Add a free-text note to the current step or story.
        /// </summary>
        public static DocEntry Note(string text, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Note(text, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add tag(s) for categorization.
        /// </summary>
        public static DocEntry Tag(string[] names, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            ctx.Tags.AddRange(names);
            var entry = DocEntry.Tag(names, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add tag(s) for categorization (params overload).
        /// </summary>
        public static DocEntry Tag(params string[] names)
        {
            return Tag(names, null);
        }

        /// <summary>
        /// Add a key-value pair.
        /// </summary>
        public static DocEntry Kv(string label, object value, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Kv(label, value, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a JSON data block with label (kind=code, lang=json).
        /// </summary>
        public static DocEntry Json(string label, object value, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Json(label, value, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a snapshot of the world at the current step (kind=state).
        /// Label names the entity for diffing across steps; omitted when null.
        /// </summary>
        public static DocEntry State(object value, string? label = null, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.State(value, label, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a code block with optional language.
        /// </summary>
        public static DocEntry Code(string label, string content, string? lang = null, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Code(label, content, lang, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a markdown table.
        /// </summary>
        public static DocEntry Table(string label, string[] columns, string[][] rows, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Table(label, columns, rows, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a hyperlink.
        /// </summary>
        public static DocEntry Link(string label, string url, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Link(label, url, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a titled section with markdown content.
        /// </summary>
        public static DocEntry Section(string title, string markdown, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Section(title, markdown, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a Mermaid diagram with optional title.
        /// </summary>
        public static DocEntry Mermaid(string code, string? title = null, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Mermaid(code, title, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a screenshot reference.
        /// </summary>
        public static DocEntry Screenshot(string path, string? alt = null, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Screenshot(path, alt, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a video recording, played inline in the HTML report.
        /// </summary>
        public static DocEntry Video(string path, string? caption = null, string? poster = null, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Video(path, caption, poster, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Embed HTML in an always-sandboxed iframe. Exactly one of
        /// <paramref name="path"/>, <paramref name="url"/>, or <paramref name="content"/> must be set.
        /// </summary>
        public static DocEntry Html(
            string? path = null,
            string? url = null,
            string? content = null,
            string? title = null,
            object? height = null,
            DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Html(path, url, content, title, height, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a custom documentation entry.
        /// </summary>
        public static DocEntry Custom(string type, object data, DocEntry[]? children = null)
        {
            StoryContext ctx = RequireContext();
            var entry = DocEntry.Custom(type, data, children);
            ctx.AddDoc(entry);
            return entry;
        }

        /// <summary>
        /// Add a ticket reference. Accepts a string ID or a Ticket object with optional URL.
        /// </summary>
        public static void Ticket(string id, string? url = null)
        {
            StoryContext ctx = RequireContext();
            ctx.Tickets.Add(new Ticket(id, url));
        }

        /// <summary>
        /// Add a ticket reference from a Ticket object.
        /// </summary>
        public static void Ticket(Ticket ticket)
        {
            StoryContext ctx = RequireContext();
            ctx.Tickets.Add(ticket);
        }

        /// <summary>
        /// Declare the product-code paths/globs this story exercises.
        /// </summary>
        public static void Covers(params string[] paths)
        {
            StoryContext ctx = RequireContext();
            ctx.Covers.AddRange(paths);
        }

        /// <summary>
        /// Record the current story to the in-process collector and clear context.
        /// Call at the end of each test when using dotnet test (VSTest does not use the runner reporter).
        /// Results are written to .executable-stories/raw-run.json on process exit.
        /// </summary>
        /// <param name="status">Test status: pass, fail, or skip.</param>
        public static void RecordAndClear(string status = "pass")
        {
            RecordAndClear(status, null, null);
        }

        /// <summary>
        /// Record the current story with an outcome and failure details, then clear it.
        /// </summary>
        /// <param name="status">Test status: pass, fail, or skip.</param>
        /// <param name="error">Failure details, when the test failed.</param>
        /// <param name="titlePath">Suite path for the scenario, outermost first.</param>
        /// <param name="sourceKey">Key the report groups by. On .NET, the test class.</param>
        public static void RecordAndClear(
            string status,
            RawTestError? error,
            IReadOnlyList<string>? titlePath,
            string? sourceKey = null)
        {
            StoryContext? ctx = _holder.Value?.Context;
            if (ctx == null)
            {
                return;
            }

            List<Dictionary<string, object?>> attachments = ctx.GetAttachments();

            // Build stepEvents (timing)
            var stepEvents = ctx.Steps
                .Select((step, index) => new { step, index })
                .Where(x => x.step.DurationMs.HasValue)
                .Select(x => new Dictionary<string, object>
                {
                    ["index"] = x.index,
                    ["title"] = x.step.Text,
                    ["durationMs"] = x.step.DurationMs!.Value
                })
                .ToList();

            var durationMs = Stopwatch.GetElapsedTime(ctx.StartedTicks).TotalMilliseconds;
            var testCase = new RawTestCase
            {
                Title = ctx.Scenario,
                Status = status,
                DurationMs = durationMs,
                Story = ctx.ToStoryMeta(),
                Retry = 0,
                Retries = 0,
                Attachments = attachments.Count > 0 ? attachments : null,
                StepEvents = stepEvents.Count > 0 ? stepEvents : null,
                Error = error,
                TitlePath = titlePath is null ? null : [.. titlePath, ctx.Scenario],
                SourceFile = sourceKey
            };
            InProcessCollector.Record(testCase);
            Holder().Context = null;
        }

        // ========================================================================
        // Attachment Methods
        // ========================================================================

        /// <summary>
        /// Attach a file by path.
        /// </summary>
        public static void Attach(string name, string mediaType, string path)
        {
            RequireContext().AddAttachment(name, mediaType, path: path);
        }

        /// <summary>
        /// Attach inline content.
        /// </summary>
        public static void AttachInline(string name, string mediaType, string body, string encoding = "IDENTITY")
        {
            RequireContext().AddAttachment(name, mediaType, body: body, encoding: encoding);
        }

        // ========================================================================
        // OTel Span Attachment
        // ========================================================================

        /// <summary>
        /// Attach OTel spans for trace waterfall rendering in HTML reports.
        /// </summary>
        public static void AttachSpans(List<object> spans)
        {
            RequireContext().OtelSpans = spans;
        }

        // ========================================================================
        // Step Timing
        // ========================================================================

        /// <summary>
        /// Start a high-resolution timer tied to the current step. Returns a token to pass to EndTimer.
        /// </summary>
        public static int StartTimer()
        {
            return RequireContext().StartTimer();
        }

        /// <summary>
        /// Stop the timer and record durationMs on the step that was active when StartTimer() was called. Double-end is a no-op.
        /// </summary>
        public static void EndTimer(int token)
        {
            RequireContext().EndTimer(token);
        }

        // ========================================================================
        // Wrapped Step Execution
        // ========================================================================

        /// <summary>
        /// Wrap an action as a BDD step with automatic timing.
        /// Creates a step marked as <c>wrapped=true</c>, executes the body,
        /// records <c>durationMs</c>, and re-throws any exception.
        /// </summary>
        public static void Fn(string keyword, string text, Action body)
        {
            StoryContext ctx = RequireContext();
            ctx.AddStep(keyword, text);
            StoryStep step = ctx.CurrentStep!;
            step.Wrapped = true;
            // Wrapping a claim is the only signal xUnit can give that the step
            // checked something: the body ran to completion. Setup steps
            // arrange, so only a claim counts — tested against the keyword as
            // written, since auto-And rewrites a repeated Then before storage.
            if (keyword == "Then")
            {
                step.Assertions = 1;
            }

            var start = Stopwatch.GetTimestamp();
            try
            {
                body();
            }
            finally
            {
                step.DurationMs = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            }
        }

        /// <summary>
        /// Wrap a function as a BDD step with automatic timing, returning the result.
        /// </summary>
        public static T Fn<T>(string keyword, string text, Func<T> body)
        {
            StoryContext ctx = RequireContext();
            ctx.AddStep(keyword, text);
            StoryStep step = ctx.CurrentStep!;
            step.Wrapped = true;
            // Wrapping a claim is the only signal xUnit can give that the step
            // checked something: the body ran to completion. Setup steps
            // arrange, so only a claim counts — tested against the keyword as
            // written, since auto-And rewrites a repeated Then before storage.
            if (keyword == "Then")
            {
                step.Assertions = 1;
            }

            var start = Stopwatch.GetTimestamp();
            try
            {
                return body();
            }
            finally
            {
                step.DurationMs = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            }
        }

        /// <summary>
        /// Shorthand for <c>Fn("Then", text, body)</c>.
        /// </summary>
        public static void Expect(string text, Action body)
        {
            Fn("Then", text, body);
        }

        /// <summary>
        /// Shorthand for <c>Fn("Then", text, body)</c>, returning the result.
        /// </summary>
        public static T Expect<T>(string text, Func<T> body)
        {
            return Fn("Then", text, body);
        }

        // ========================================================================
        // Internal
        // ========================================================================

        /// <summary>
        /// Set a URL template for trace links. Use {traceId} as placeholder.
        /// Takes precedence over the OTEL_TRACE_URL_TEMPLATE environment variable.
        /// </summary>
        public static void WithTraceUrlTemplate(string template)
        {
            RequireContext().TraceUrlTemplate = template;
        }

        /// <summary>
        /// Suite heading for a fully qualified class name, or null when there is none.
        /// </summary>
        /// <remarks>
        /// The class name arrives fully qualified. Report headings read better
        /// with just the class, the way a describe block reads in Vitest.
        /// </remarks>
        internal static IReadOnlyList<string>? SuitePathFor(string? className)
        {
            if (string.IsNullOrEmpty(className))
            {
                return null;
            }

            var lastDot = className.LastIndexOf('.');
            return [lastDot < 0 ? className : className[(lastDot + 1)..]];
        }

        internal static StoryContext? GetContext()
        {
            return _holder.Value?.Context;
        }

        internal static void Clear()
        {
            Holder().Context = null;
        }

        private static void BridgeOtel(StoryContext ctx)
        {
            try
            {
                Activity? activity = Activity.Current;
                if (activity == null)
                {
                    return;
                }

                var traceId = activity.TraceId.ToString();
                var spanId = activity.SpanId.ToString();

                if (string.IsNullOrEmpty(traceId) || traceId == "00000000000000000000000000000000")
                {
                    return;
                }

                // OTel -> Story: capture traceId in structured meta
                ctx.Meta["otel"] = new Dictionary<string, object>
                {
                    ["traceId"] = traceId,
                    ["spanId"] = spanId
                };

                // OTel -> Story: inject human-readable doc entries
                ctx.Docs.Add(DocEntry.Kv("Trace ID", traceId));

                var template = ctx.TraceUrlTemplate ?? Environment.GetEnvironmentVariable("OTEL_TRACE_URL_TEMPLATE");
                if (!string.IsNullOrEmpty(template))
                {
                    var url = template.Replace("{traceId}", traceId);
                    ctx.Docs.Add(DocEntry.Link("View Trace", url));
                }

                // Story -> OTel: enrich active Activity with story attributes
                _ = activity.SetTag("story.scenario", ctx.Scenario);
                if (ctx.Tags.Count > 0)
                {
                    _ = activity.SetTag("story.tags", string.Join(",", ctx.Tags));
                }

                if (ctx.Tickets.Count > 0)
                {
                    _ = activity.SetTag("story.tickets", string.Join(",", ctx.Tickets.Select(t => t.Id)));
                }
            }
            catch
            {
                // OTel not available - no-op
            }
        }

        private static void AddStep(string keyword, string text, params DocEntry[]? docs)
        {
            StoryContext ctx = RequireContext();
            ctx.AddStep(keyword, text, docs);
        }

        private static StoryContext RequireContext()
        {
            return _holder.Value?.Context
                ?? throw new InvalidOperationException(
                    "Story.Init() must be called before using step or doc methods. " +
                    "Call Story.Init(\"scenario name\") at the start of your test.");
        }
    }
}
