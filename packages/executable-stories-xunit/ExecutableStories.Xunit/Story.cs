using System.Diagnostics;

namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Static fluent API for defining BDD stories within xUnit tests.
    /// Uses AsyncLocal to maintain per-test context in concurrent scenarios.
    /// </summary>
    public static class Story
    {
        private static readonly AsyncLocal<StoryContext?> _context = new();

        /// <summary>
        /// Initialize a new story for the current test.
        /// </summary>
        /// <param name="scenario">The scenario title.</param>
        /// <param name="tags">Optional tags for categorization.</param>
        public static void Init(string scenario, params string[] tags)
        {
            var ctx = new StoryContext(scenario, tags);
            _context.Value = ctx;
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
            _context.Value = new StoryContext(scenario, tags);
            RecordAndClear("todo");
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
            StoryContext? ctx = _context.Value;
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
                StepEvents = stepEvents.Count > 0 ? stepEvents : null
            };
            InProcessCollector.Record(testCase);
            _context.Value = null;
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

        internal static StoryContext? GetContext()
        {
            return _context.Value;
        }

        internal static void Clear()
        {
            _context.Value = null;
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
            return _context.Value
                ?? throw new InvalidOperationException(
                    "Story.Init() must be called before using step or doc methods. " +
                    "Call Story.Init(\"scenario name\") at the start of your test.");
        }
    }
}
