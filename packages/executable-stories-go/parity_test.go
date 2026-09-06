package es

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// --- atomic write ---------------------------------------------------------

// TestWriteRawRunLeavesNoPartialFile: a reader picking the file up mid-run must
// never see a truncated document, and a failed write must leave the last good
// report in place rather than a broken one.
func TestWriteRawRunLeavesNoPartialFile(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "raw-run.json")

	good := RawRun{SchemaVersion: 1, ProjectRoot: "first"}
	if err := writeRawRun(good, out); err != nil {
		t.Fatalf("first write: %v", err)
	}

	// A doc entry holding something json cannot marshal.
	broken := RawRun{SchemaVersion: 1, ProjectRoot: "second", Meta: map[string]any{"ch": make(chan int)}}
	if err := writeRawRun(broken, out); err == nil {
		t.Fatal("expected the unserializable run to fail the write")
	}

	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("read back: %v", err)
	}
	var back RawRun
	if err := json.Unmarshal(data, &back); err != nil {
		t.Fatalf("previous report was left unreadable: %v", err)
	}
	if back.ProjectRoot != "first" {
		t.Fatalf("expected the previous report intact, got %q", back.ProjectRoot)
	}

	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if e.Name() != "raw-run.json" {
			t.Fatalf("stray temp file left behind: %s", e.Name())
		}
	}
}

// TestWriteRawRunIsAtomic: a reader polling the report while the suite writes
// it must always parse. A plain write truncates the file first, so a reader
// that lands in the middle of one gets a broken document.
func TestWriteRawRunIsAtomic(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "raw-run.json")

	big := RawRun{SchemaVersion: 1}
	for i := 0; i < 1200; i++ {
		big.TestCases = append(big.TestCases, RawTestCase{
			Title:  strings.Repeat("scenario ", 12),
			Status: "pass",
		})
	}
	if err := writeRawRun(big, out); err != nil {
		t.Fatalf("seed write: %v", err)
	}

	done := make(chan struct{})
	torn := make(chan string, 1)
	go func() {
		defer close(done)
		for i := 0; i < 60; i++ {
			data, err := os.ReadFile(out)
			if err != nil {
				continue // the path is never missing, but a rename can race the open
			}
			var back RawRun
			if err := json.Unmarshal(data, &back); err != nil {
				select {
				case torn <- err.Error():
				default:
				}
				return
			}
		}
	}()

	for i := 0; i < 60; i++ {
		if err := writeRawRun(big, out); err != nil {
			t.Fatalf("write %d: %v", i, err)
		}
	}
	<-done

	select {
	case err := <-torn:
		t.Fatalf("a reader saw a half-written report: %s", err)
	default:
	}
}

// --- timer map ------------------------------------------------------------

func TestEndTimerReleasesTheEntry(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestTimers"}, "timers")
	s.Given("a step")
	token := s.StartTimer()
	s.EndTimer(token)

	if len(s.activeTimers) != 0 {
		t.Fatalf("expected the finished timer to be released, %d still held", len(s.activeTimers))
	}
	s.EndTimer(token) // double-end stays a no-op
}

func TestEndTimerPrefersTheStepID(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestTimerID"}, "timer id")
	s.Given("the timed step")
	token := s.StartTimer()
	time.Sleep(time.Millisecond)
	// Steps added after the timer started must not steal its duration.
	s.When("a later step")
	s.EndTimer(token)

	if s.steps[0].DurationMs == nil {
		t.Fatal("expected the timed step to carry the duration")
	}
	if s.steps[1].DurationMs != nil {
		t.Fatalf("expected the later step untimed, got %v", *s.steps[1].DurationMs)
	}
}

// --- attachSpans ----------------------------------------------------------

func TestAttachSpansAppends(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestSpans"}, "spans")
	s.AttachSpans([]any{map[string]any{"spanId": "a"}})
	s.AttachSpans([]any{map[string]any{"spanId": "b"}})

	if len(s.otelSpans) != 2 {
		t.Fatalf("expected both batches kept, got %d", len(s.otelSpans))
	}
}

// TestAttachSpansWiresTheTrace covers the case the init-time bridge cannot:
// the trace is created by the test itself, after Init has already run.
func TestAttachSpansWiresTheTrace(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestSpanTrace"}, "late trace",
		WithTraceUrlTemplate("https://tempo.example/trace/{traceId}"))
	s.AttachSpansWithTrace(nil, TraceRef{TraceID: "abc123", SpanID: "def456"})

	otel, ok := s.meta["otel"].(map[string]any)
	if !ok || otel["traceId"] != "abc123" || otel["spanId"] != "def456" {
		t.Fatalf("expected the trace in meta, got %v", s.meta)
	}
	var linked string
	for _, d := range s.docs {
		if d["kind"] == "link" {
			linked, _ = d["url"].(string)
		}
	}
	if linked != "https://tempo.example/trace/abc123" {
		t.Fatalf("expected a resolved trace link, got %q", linked)
	}
}

// --- video ----------------------------------------------------------------

func TestVideoDocEntry(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestVideo"}, "video")
	s.Given("a recorded run")
	entry := s.Video("/videos/run.mp4", VideoOptions{Caption: "Full run", Poster: "/videos/run.jpg"})

	if entry["kind"] != "video" || entry["path"] != "/videos/run.mp4" {
		t.Fatalf("unexpected video entry: %v", entry)
	}
	if entry["caption"] != "Full run" || entry["poster"] != "/videos/run.jpg" {
		t.Fatalf("expected caption and poster, got %v", entry)
	}
	if len(s.steps[0].Docs) != 1 {
		t.Fatalf("expected the entry on the current step, got %d docs", len(s.steps[0].Docs))
	}
}

// --- AAA aliases ----------------------------------------------------------

func TestStepAliases(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestAliases"}, "aliases")
	s.Arrange("a precondition")
	s.Act("an action")
	s.Assert("an outcome")
	s.Setup("more setup")
	s.Execute("more action")
	s.Verify("another outcome")

	want := []string{"Given", "When", "Then", "And", "And", "And"}
	if len(s.steps) != len(want) {
		t.Fatalf("expected %d steps, got %d", len(want), len(s.steps))
	}
	for i, k := range want {
		if s.steps[i].Keyword != k {
			t.Fatalf("step %d: expected %q, got %q", i, k, s.steps[i].Keyword)
		}
	}
}

// --- suite path -----------------------------------------------------------

func TestSuitePathFromSubtestName(t *testing.T) {
	reset()
	mt := &mockT{name: "TestCheckout/discounts/a_percentage_is_applied"}
	s := Init(mt, "a percentage discount is applied")
	mt.runCleanups()

	tc := getAll()[0]
	want := []string{"TestCheckout", "discounts"}
	if strings.Join(tc.Story.SuitePath, "/") != strings.Join(want, "/") {
		t.Fatalf("expected suite path %v, got %v", want, tc.Story.SuitePath)
	}
	_ = s
}

func TestTopLevelTestHasNoSuitePath(t *testing.T) {
	reset()
	mt := &mockT{name: "TestCheckout"}
	Init(mt, "checkout works")
	mt.runCleanups()

	if sp := getAll()[0].Story.SuitePath; len(sp) != 0 {
		t.Fatalf("expected no suite path for a top-level test, got %v", sp)
	}
}

// --- large state warning --------------------------------------------------

func TestLargeStateWarns(t *testing.T) {
	reset()
	var warned string
	orig := warn
	warn = func(format string, args ...any) { warned = format }
	defer func() { warn = orig }()

	s := Init(&mockT{name: "TestBigState"}, "big state")
	s.State("Basket", strings.Repeat("x", 200_000))

	if warned == "" {
		t.Fatal("expected a warning for an oversized state snapshot")
	}
}

func TestSmallStateIsQuiet(t *testing.T) {
	reset()
	called := false
	orig := warn
	warn = func(format string, args ...any) { called = true }
	defer func() { warn = orig }()

	s := Init(&mockT{name: "TestSmallState"}, "small state")
	s.State("Basket", map[string]any{"items": 1})

	if called {
		t.Fatal("expected no warning for an ordinary snapshot")
	}
}

// --- inline step docs -----------------------------------------------------

func TestStepTakesInlineDocs(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestInlineDocs"}, "inline docs")
	s.Given("valid credentials", KvEntry("email", "a@b.c"), NoteEntry("password masked"))

	if len(s.steps[0].Docs) != 2 {
		t.Fatalf("expected 2 docs on the step, got %d", len(s.steps[0].Docs))
	}
	if len(s.docs) != 0 {
		t.Fatalf("expected nothing left at story level, got %d", len(s.docs))
	}
}

// --- attachment options ---------------------------------------------------

func TestAttachOptionsCarriesEveryField(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestAttach"}, "attachments")
	s.Given("a step")
	s.AttachOptions(AttachmentOptions{
		Name:      "report",
		MediaType: "text/csv",
		Body:      "a,b\n1,2",
		Encoding:  "IDENTITY",
		Charset:   "utf-8",
		FileName:  "report.csv",
	})

	a := s.attachments[0]
	if a.Charset == nil || *a.Charset != "utf-8" {
		t.Fatalf("expected charset carried, got %v", a.Charset)
	}
	if a.FileName == nil || *a.FileName != "report.csv" {
		t.Fatalf("expected file name carried, got %v", a.FileName)
	}
	if a.StepID == nil || *a.StepID != s.steps[0].ID {
		t.Fatalf("expected the attachment scoped to the current step, got %v", a.StepID)
	}
}
