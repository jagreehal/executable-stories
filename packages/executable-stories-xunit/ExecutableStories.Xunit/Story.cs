using System.Diagnostics;

namespace ExecutableStories.Xunit;

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

    // ========================================================================
    // BDD Step Markers
    // ========================================================================

    public static void Given(string text) => AddStep("Given", text);
    public static void When(string text) => AddStep("When", text);
    public static void Then(string text) => AddStep("Then", text);
    public static void And(string text) => AddStep("And", text);
    public static void But(string text) => AddStep("But", text);

    public static void Given(string text, params DocEntry[] docs) => AddStep("Given", text, docs);
    public static void When(string text, params DocEntry[] docs) => AddStep("When", text, docs);
    public static void Then(string text, params DocEntry[] docs) => AddStep("Then", text, docs);
    public static void And(string text, params DocEntry[] docs) => AddStep("And", text, docs);
    public static void But(string text, params DocEntry[] docs) => AddStep("But", text, docs);

    // ========================================================================
    // AAA Pattern Aliases
    // ========================================================================

    /// <summary>Add an Arrange step (alias for Given).</summary>
    public static void Arrange(string text) => AddStep("Given", text);
    public static void Arrange(string text, params DocEntry[] docs) => AddStep("Given", text, docs);

    /// <summary>Add an Act step (alias for When).</summary>
    public static void Act(string text) => AddStep("When", text);
    public static void Act(string text, params DocEntry[] docs) => AddStep("When", text, docs);

    /// <summary>Add an Assert step (alias for Then).</summary>
    public static void Assert(string text) => AddStep("Then", text);
    public static void Assert(string text, params DocEntry[] docs) => AddStep("Then", text, docs);

    // ========================================================================
    // Additional Aliases
    // ========================================================================

    /// <summary>Add a Setup step (alias for Given).</summary>
    public static void Setup(string text) => AddStep("Given", text);
    public static void Setup(string text, params DocEntry[] docs) => AddStep("Given", text, docs);

    /// <summary>Add a Context step (alias for Given).</summary>
    public static void Context(string text) => AddStep("Given", text);
    public static void Context(string text, params DocEntry[] docs) => AddStep("Given", text, docs);

    /// <summary>Add an Execute step (alias for When).</summary>
    public static void Execute(string text) => AddStep("When", text);
    public static void Execute(string text, params DocEntry[] docs) => AddStep("When", text, docs);

    /// <summary>Add an Action step (alias for When).</summary>
    public static void Action(string text) => AddStep("When", text);
    public static void Action(string text, params DocEntry[] docs) => AddStep("When", text, docs);

    /// <summary>Add a Verify step (alias for Then).</summary>
    public static void Verify(string text) => AddStep("Then", text);
    public static void Verify(string text, params DocEntry[] docs) => AddStep("Then", text, docs);

    // ========================================================================
    // Documentation Methods
    // ========================================================================

    /// <summary>
    /// Add a free-text note to the current step or story.
    /// </summary>
    public static void Note(string text)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Note(text));
    }

    /// <summary>
    /// Add tag(s) for categorization.
    /// </summary>
    public static void Tag(params string[] names)
    {
        var ctx = RequireContext();
        ctx.Tags.AddRange(names);
        ctx.AddDoc(DocEntry.Tag(names));
    }

    /// <summary>
    /// Add a key-value pair.
    /// </summary>
    public static void Kv(string label, object value)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Kv(label, value));
    }

    /// <summary>
    /// Add a JSON data block with label (kind=code, lang=json).
    /// </summary>
    public static void Json(string label, object value)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Json(label, value));
    }

    /// <summary>
    /// Add a code block with optional language.
    /// </summary>
    public static void Code(string label, string content, string? lang = null)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Code(label, content, lang));
    }

    /// <summary>
    /// Add a markdown table.
    /// </summary>
    public static void Table(string label, string[] columns, string[][] rows)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Table(label, columns, rows));
    }

    /// <summary>
    /// Add a hyperlink.
    /// </summary>
    public static void Link(string label, string url)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Link(label, url));
    }

    /// <summary>
    /// Add a titled section with markdown content.
    /// </summary>
    public static void Section(string title, string markdown)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Section(title, markdown));
    }

    /// <summary>
    /// Add a Mermaid diagram with optional title.
    /// </summary>
    public static void Mermaid(string code, string? title = null)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Mermaid(code, title));
    }

    /// <summary>
    /// Add a screenshot reference.
    /// </summary>
    public static void Screenshot(string path, string? alt = null)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Screenshot(path, alt));
    }

    /// <summary>
    /// Add a custom documentation entry.
    /// </summary>
    public static void Custom(string type, object data)
    {
        var ctx = RequireContext();
        ctx.AddDoc(DocEntry.Custom(type, data));
    }

    /// <summary>
    /// Record the current story to the in-process collector and clear context.
    /// Call at the end of each test when using dotnet test (VSTest does not use the runner reporter).
    /// Results are written to .executable-stories/raw-run.json on process exit.
    /// </summary>
    /// <param name="status">Test status: pass, fail, or skip.</param>
    public static void RecordAndClear(string status = "pass")
    {
        var ctx = _context.Value;
        if (ctx == null) return;
        var attachments = ctx.GetAttachments();

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

        var durationMs = System.Diagnostics.Stopwatch.GetElapsedTime(ctx.StartedTicks).TotalMilliseconds;
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
        => RequireContext().AddAttachment(name, mediaType, path: path);

    /// <summary>
    /// Attach inline content.
    /// </summary>
    public static void AttachInline(string name, string mediaType, string body, string encoding = "IDENTITY")
        => RequireContext().AddAttachment(name, mediaType, body: body, encoding: encoding);

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
        var ctx = RequireContext();
        ctx.AddStep(keyword, text);
        var step = ctx.CurrentStep!;
        step.Wrapped = true;

        var start = System.Diagnostics.Stopwatch.GetTimestamp();
        try
        {
            body();
        }
        finally
        {
            step.DurationMs = System.Diagnostics.Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        }
    }

    /// <summary>
    /// Wrap a function as a BDD step with automatic timing, returning the result.
    /// </summary>
    public static T Fn<T>(string keyword, string text, Func<T> body)
    {
        var ctx = RequireContext();
        ctx.AddStep(keyword, text);
        var step = ctx.CurrentStep!;
        step.Wrapped = true;

        var start = System.Diagnostics.Stopwatch.GetTimestamp();
        try
        {
            return body();
        }
        finally
        {
            step.DurationMs = System.Diagnostics.Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        }
    }

    /// <summary>
    /// Shorthand for <c>Fn("Then", text, body)</c>.
    /// </summary>
    public static void Expect(string text, Action body) => Fn("Then", text, body);

    /// <summary>
    /// Shorthand for <c>Fn("Then", text, body)</c>, returning the result.
    /// </summary>
    public static T Expect<T>(string text, Func<T> body) => Fn("Then", text, body);

    // ========================================================================
    // Internal
    // ========================================================================

    internal static StoryContext? GetContext() => _context.Value;

    internal static void Clear() => _context.Value = null;

    private static void BridgeOtel(StoryContext ctx)
    {
        try
        {
            var activity = Activity.Current;
            if (activity == null) return;

            var traceId = activity.TraceId.ToString();
            var spanId = activity.SpanId.ToString();

            if (string.IsNullOrEmpty(traceId) || traceId == "00000000000000000000000000000000")
                return;

            // OTel -> Story: capture traceId in structured meta
            ctx.Meta["otel"] = new Dictionary<string, object>
            {
                ["traceId"] = traceId,
                ["spanId"] = spanId
            };

            // OTel -> Story: inject human-readable doc entries
            ctx.Docs.Add(DocEntry.Kv("Trace ID", traceId));

            var template = Environment.GetEnvironmentVariable("OTEL_TRACE_URL_TEMPLATE");
            if (!string.IsNullOrEmpty(template))
            {
                var url = template.Replace("{traceId}", traceId);
                ctx.Docs.Add(DocEntry.Link("View Trace", url));
            }

            // Story -> OTel: enrich active Activity with story attributes
            activity.SetTag("story.scenario", ctx.Scenario);
            if (ctx.Tags.Count > 0)
                activity.SetTag("story.tags", string.Join(",", ctx.Tags));
            if (ctx.Tickets.Count > 0)
                activity.SetTag("story.tickets", string.Join(",", ctx.Tickets));
        }
        catch
        {
            // OTel not available - no-op
        }
    }

    private static void AddStep(string keyword, string text, params DocEntry[]? docs)
    {
        var ctx = RequireContext();
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
