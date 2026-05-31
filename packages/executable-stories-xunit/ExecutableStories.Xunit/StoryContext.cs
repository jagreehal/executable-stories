namespace ExecutableStories.Xunit
{
    /// <summary>
    /// Holds per-test BDD story state, managed by <see cref="Story"/> via AsyncLocal.
    /// </summary>
    public class StoryContext(string scenario)
    {
        private static int _orderCounter;
        private sealed class TimerEntry
        {
            public long StartTicks { get; init; }
            public int? StepIndex { get; init; }
            public string? StepId { get; init; }
            public bool Consumed { get; set; }
        }

        public string Scenario { get; } = scenario;
        public List<StoryStep> Steps { get; } = [];
        public List<string> Tags { get; } = [];
        public List<Ticket> Tickets { get; } = [];
        public List<string> Covers { get; } = [];
        public Dictionary<string, object> Meta { get; } = [];
        public List<DocEntry> Docs { get; } = [];
        public int SourceOrder { get; } = Interlocked.Increment(ref _orderCounter) - 1;
        public long StartedTicks { get; } = System.Diagnostics.Stopwatch.GetTimestamp();
        public StoryStep? CurrentStep { get; set; }
        public string? TraceUrlTemplate { get; set; }
        private readonly HashSet<string> _seenPrimary = [];
        private int _stepCounter;
        private readonly List<Dictionary<string, object?>> _attachments = [];
        private readonly Dictionary<int, TimerEntry> _activeTimers = [];
        private int _timerCounter;
        public List<object>? OtelSpans { get; set; }

        public StoryContext(string scenario, params string[] tags) : this(scenario)
        {
            Tags.AddRange(tags);
        }

        /// <summary>
        /// Add a new step and set it as the current step.
        /// </summary>
        public void AddStep(string keyword, string text, DocEntry[]? docs = null)
        {
            // Auto-And: repeated primary keywords render as "And"
            var effective = keyword;
            if (keyword is "Given" or "When" or "Then")
            {
                if (!_seenPrimary.Add(keyword))
                {
                    effective = "And";
                }
            }
            var step = new StoryStep
            {
                Keyword = effective,
                Text = text,
                Id = $"step-{_stepCounter++}"
            };
            Steps.Add(step);
            CurrentStep = step;

            if (docs is { Length: > 0 })
            {
                foreach (DocEntry doc in docs)
                {
                    step.Docs ??= [];
                    step.Docs.Add(doc);
                }
            }
        }

        /// <summary>
        /// Start a high-resolution timer tied to the current step. Returns a token to pass to EndTimer.
        /// </summary>
        public int StartTimer()
        {
            var token = _timerCounter++;
            int? stepIndex = CurrentStep != null ? Steps.Count - 1 : null;
            var stepId = CurrentStep?.Id;
            _activeTimers[token] = new TimerEntry
            {
                StartTicks = System.Diagnostics.Stopwatch.GetTimestamp(),
                StepIndex = stepIndex,
                StepId = stepId,
                Consumed = false
            };
            return token;
        }

        /// <summary>
        /// End the timer and record durationMs on the step that was active when StartTimer() was called.
        /// Double-end is a no-op.
        /// </summary>
        public void EndTimer(int token)
        {
            if (!_activeTimers.TryGetValue(token, out TimerEntry? entry) || entry.Consumed)
            {
                return;
            }

            entry.Consumed = true;

            TimeSpan elapsed = System.Diagnostics.Stopwatch.GetElapsedTime(entry.StartTicks);
            var durationMs = elapsed.TotalMilliseconds;

            StoryStep? step = null;
            if (entry.StepId != null)
            {
                step = Steps.FirstOrDefault(s => s.Id == entry.StepId);
            }
            step ??= entry.StepIndex.HasValue && entry.StepIndex.Value < Steps.Count
                ? Steps[entry.StepIndex.Value]
                : null;

            if (step != null)
            {
                step.DurationMs = durationMs;
            }
        }

        /// <summary>
        /// Attach a doc entry to the current step, or to story-level docs if no step exists yet.
        /// </summary>
        public void AddDoc(DocEntry doc)
        {
            if (doc.Get("children") is IEnumerable<DocEntry> children)
            {
                HashSet<DocEntry> childSet = [.. children];
                _ = Docs.RemoveAll(childSet.Contains);
                foreach (StoryStep step in Steps)
                {
                    if (step.Docs != null)
                    {
                        _ = step.Docs.RemoveAll(childSet.Contains);
                    }
                }
            }

            if (CurrentStep != null)
            {
                CurrentStep.Docs ??= [];
                CurrentStep.Docs.Add(doc);
            }
            else
            {
                Docs.Add(doc);
            }
        }

        /// <summary>
        /// Convert this context to a <see cref="StoryMeta"/> POCO for serialization.
        /// </summary>
        public StoryMeta ToStoryMeta()
        {
            return new StoryMeta
            {
                Scenario = Scenario,
                Steps = Steps.Count > 0 ? new List<StoryStep>(Steps) : null,
                Tags = Tags.Count > 0 ? new List<string>(Tags) : null,
                Tickets = Tickets.Count > 0 ? new List<Ticket>(Tickets) : null,
                Covers = Covers.Count > 0 ? new List<string>(Covers) : null,
                Meta = Meta.Count > 0 ? new Dictionary<string, object>(Meta) : null,
                Docs = Docs.Count > 0 ? new List<DocEntry>(Docs) : null,
                SourceOrder = SourceOrder,
                OtelSpans = OtelSpans
            };
        }

        /// <summary>
        /// Add an attachment to the current story context.
        /// </summary>
        public void AddAttachment(string name, string mediaType, string? path = null, string? body = null, string? encoding = null)
        {
            var a = new Dictionary<string, object?>
            {
                ["name"] = name,
                ["mediaType"] = mediaType,
            };
            if (path != null)
            {
                a["path"] = path;
            }

            if (body != null)
            {
                a["body"] = body;
            }

            if (encoding != null)
            {
                a["encoding"] = encoding;
            }

            if (CurrentStep != null)
            {
                a["stepIndex"] = Steps.IndexOf(CurrentStep);
                a["stepId"] = CurrentStep.Id;
            }
            _attachments.Add(a);
        }

        public List<Dictionary<string, object?>> GetAttachments()
        {
            return _attachments;
        }

        /// <summary>
        /// Reset the global source order counter (useful for tests).
        /// </summary>
        internal static void ResetOrderCounter()
        {
            _ = Interlocked.Exchange(ref _orderCounter, 0);
        }
    }
}
