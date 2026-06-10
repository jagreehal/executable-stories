package es

import (
	"encoding/json"
	"testing"
	"time"
)

// mockT implements TestingT for unit testing.
type mockT struct {
	name     string
	failed   bool
	skipped  bool
	cleanups []func()
}

func (m *mockT) Name() string     { return m.name }
func (m *mockT) Failed() bool     { return m.failed }
func (m *mockT) Skipped() bool    { return m.skipped }
func (m *mockT) Helper()          {}
func (m *mockT) Cleanup(f func()) { m.cleanups = append(m.cleanups, f) }

// runCleanups executes all registered cleanup functions in LIFO order (matching Go's behavior).
func (m *mockT) runCleanups() {
	for i := len(m.cleanups) - 1; i >= 0; i-- {
		m.cleanups[i]()
	}
}

func TestInit(t *testing.T) {
	reset()

	mt := &mockT{name: "TestLogin"}
	s := Init(mt, "user logs in successfully")

	if s.scenario != "user logs in successfully" {
		t.Fatalf("expected scenario %q, got %q", "user logs in successfully", s.scenario)
	}
	if s.t != mt {
		t.Fatal("expected t to be set")
	}
	if s.startTime.IsZero() {
		t.Fatal("expected startTime to be set")
	}
}

func TestSteps(t *testing.T) {
	reset()

	mt := &mockT{name: "TestSteps"}
	s := Init(mt, "step keywords")

	s.Given("a precondition").
		When("an action occurs").
		Then("the expected outcome").
		And("another outcome").
		But("not this outcome")

	if len(s.steps) != 5 {
		t.Fatalf("expected 5 steps, got %d", len(s.steps))
	}

	expected := []struct {
		keyword string
		text    string
	}{
		{"Given", "a precondition"},
		{"When", "an action occurs"},
		{"Then", "the expected outcome"},
		{"And", "another outcome"},
		{"But", "not this outcome"},
	}

	for i, exp := range expected {
		if s.steps[i].Keyword != exp.keyword {
			t.Errorf("step %d: expected keyword %q, got %q", i, exp.keyword, s.steps[i].Keyword)
		}
		if s.steps[i].Text != exp.text {
			t.Errorf("step %d: expected text %q, got %q", i, exp.text, s.steps[i].Text)
		}
	}
}

func TestAutoAndForRepeatedKeywords(t *testing.T) {
	reset()

	mt := &mockT{name: "TestAutoAnd"}
	s := Init(mt, "auto and")

	s.Given("first given")
	s.Given("second given")
	s.When("first when")
	s.When("second when")
	s.Then("first then")
	s.Then("second then")

	expected := []struct {
		keyword string
		text    string
	}{
		{"Given", "first given"},
		{"And", "second given"},
		{"When", "first when"},
		{"And", "second when"},
		{"Then", "first then"},
		{"And", "second then"},
	}

	if len(s.steps) != len(expected) {
		t.Fatalf("expected %d steps, got %d", len(expected), len(s.steps))
	}

	for i, exp := range expected {
		if s.steps[i].Keyword != exp.keyword {
			t.Errorf("step %d: expected keyword %q, got %q", i, exp.keyword, s.steps[i].Keyword)
		}
		if s.steps[i].Text != exp.text {
			t.Errorf("step %d: expected text %q, got %q", i, exp.text, s.steps[i].Text)
		}
	}
}

func TestAutoAndForNonConsecutiveKeywords(t *testing.T) {
	reset()

	mt := &mockT{name: "TestAutoAndNonConsecutive"}
	s := Init(mt, "auto and non-consecutive")

	s.Given("first given")
	s.When("a when in between")
	s.Given("second given")

	expected := []struct {
		keyword string
		text    string
	}{
		{"Given", "first given"},
		{"When", "a when in between"},
		{"And", "second given"},
	}

	if len(s.steps) != len(expected) {
		t.Fatalf("expected %d steps, got %d", len(expected), len(s.steps))
	}

	for i, exp := range expected {
		if s.steps[i].Keyword != exp.keyword {
			t.Errorf("step %d: expected keyword %q, got %q", i, exp.keyword, s.steps[i].Keyword)
		}
		if s.steps[i].Text != exp.text {
			t.Errorf("step %d: expected text %q, got %q", i, exp.text, s.steps[i].Text)
		}
	}
}

func TestDocMethods(t *testing.T) {
	reset()

	mt := &mockT{name: "TestDocs"}
	s := Init(mt, "doc attachment")

	// Doc before any step goes to story-level
	s.Note("story-level note")

	if len(s.docs) != 1 {
		t.Fatalf("expected 1 story-level doc, got %d", len(s.docs))
	}
	if s.docs[0]["kind"] != "note" {
		t.Fatalf("expected kind=note, got %v", s.docs[0]["kind"])
	}
	if s.docs[0]["phase"] != "runtime" {
		t.Fatalf("expected phase=runtime, got %v", s.docs[0]["phase"])
	}

	// Doc after a step goes to that step
	s.Given("a step")
	s.Note("step-level note")
	s.Kv("key", "value")

	if len(s.steps[0].Docs) != 2 {
		t.Fatalf("expected 2 step docs, got %d", len(s.steps[0].Docs))
	}
	if s.steps[0].Docs[0]["kind"] != "note" {
		t.Errorf("expected first doc kind=note, got %v", s.steps[0].Docs[0]["kind"])
	}
	if s.steps[0].Docs[1]["kind"] != "kv" {
		t.Errorf("expected second doc kind=kv, got %v", s.steps[0].Docs[1]["kind"])
	}

	// New step resets the current step target
	s.When("another step")
	s.Link("example", "https://example.com")

	if len(s.steps[1].Docs) != 1 {
		t.Fatalf("expected 1 doc on second step, got %d", len(s.steps[1].Docs))
	}
	if s.steps[1].Docs[0]["kind"] != "link" {
		t.Errorf("expected kind=link, got %v", s.steps[1].Docs[0]["kind"])
	}
}

func TestJSON(t *testing.T) {
	reset()

	mt := &mockT{name: "TestJSON"}
	s := Init(mt, "json doc")

	data := map[string]any{"key": "value", "count": float64(42)}
	s.Given("some data")
	s.JSON("payload", data)

	if len(s.steps[0].Docs) != 1 {
		t.Fatalf("expected 1 doc, got %d", len(s.steps[0].Docs))
	}

	doc := s.steps[0].Docs[0]
	if doc["kind"] != "code" {
		t.Errorf("expected kind=code, got %v", doc["kind"])
	}
	if doc["lang"] != "json" {
		t.Errorf("expected lang=json, got %v", doc["lang"])
	}
	if doc["label"] != "payload" {
		t.Errorf("expected label=payload, got %v", doc["label"])
	}

	// Verify the content is valid JSON
	content, ok := doc["content"].(string)
	if !ok {
		t.Fatal("expected content to be a string")
	}
	var parsed map[string]any
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		t.Fatalf("expected valid JSON content, got error: %v", err)
	}
}

func TestCleanupPassedStatus(t *testing.T) {
	reset()

	mt := &mockT{name: "TestPassing", failed: false, skipped: false}
	Init(mt, "passing test")
	mt.runCleanups()

	cases := getAll()
	if len(cases) != 1 {
		t.Fatalf("expected 1 collected case, got %d", len(cases))
	}
	if cases[0].Status != "pass" {
		t.Errorf("expected status=pass, got %q", cases[0].Status)
	}
	if cases[0].Story == nil {
		t.Fatal("expected story to be set")
	}
	if cases[0].Story.Scenario != "passing test" {
		t.Errorf("expected scenario %q, got %q", "passing test", cases[0].Story.Scenario)
	}
	if cases[0].DurationMs == nil {
		t.Fatal("expected durationMs to be set")
	}
}

func TestCleanupFailedStatus(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFailing", failed: true, skipped: false}
	Init(mt, "failing test")
	mt.runCleanups()

	cases := getAll()
	if len(cases) != 1 {
		t.Fatalf("expected 1 collected case, got %d", len(cases))
	}
	if cases[0].Status != "fail" {
		t.Errorf("expected status=fail, got %q", cases[0].Status)
	}
}

func TestCleanupSkippedStatus(t *testing.T) {
	reset()

	mt := &mockT{name: "TestSkipping", failed: false, skipped: true}
	Init(mt, "skipped test")
	mt.runCleanups()

	cases := getAll()
	if len(cases) != 1 {
		t.Fatalf("expected 1 collected case, got %d", len(cases))
	}
	if cases[0].Status != "skip" {
		t.Errorf("expected status=skip, got %q", cases[0].Status)
	}
}

func TestOptions(t *testing.T) {
	reset()

	mt := &mockT{name: "TestOptions"}
	s := Init(mt, "option test",
		WithTags("smoke", "auth"),
		WithTicket("JIRA-123", "JIRA-456"),
		WithMeta(map[string]any{"priority": "high"}),
	)

	if len(s.tags) != 2 || s.tags[0] != "smoke" || s.tags[1] != "auth" {
		t.Errorf("unexpected tags: %v", s.tags)
	}
	if len(s.tickets) != 2 || s.tickets[0].ID != "JIRA-123" || s.tickets[1].ID != "JIRA-456" {
		t.Errorf("unexpected tickets: %v", s.tickets)
	}
	if s.tickets[0].URL != "" || s.tickets[1].URL != "" {
		t.Errorf("expected empty URLs for string-only tickets, got %v", s.tickets)
	}
	if s.meta["priority"] != "high" {
		t.Errorf("unexpected meta: %v", s.meta)
	}
}

func TestWithCovers(t *testing.T) {
	reset()

	mt := &mockT{name: "TestWithCovers"}
	s := Init(mt, "covers test", WithCovers("src/auth/login.go", "src/session.go"))

	if len(s.covers) != 2 || s.covers[0] != "src/auth/login.go" || s.covers[1] != "src/session.go" {
		t.Errorf("unexpected covers: %v", s.covers)
	}
}

func TestTableDoc(t *testing.T) {
	reset()

	mt := &mockT{name: "TestTable"}
	s := Init(mt, "table test")
	s.Given("some data")
	s.Table("users", []string{"name", "age"}, [][]string{{"Alice", "30"}, {"Bob", "25"}})

	doc := s.steps[0].Docs[0]
	if doc["kind"] != "table" {
		t.Errorf("expected kind=table, got %v", doc["kind"])
	}
	if doc["label"] != "users" {
		t.Errorf("expected label=users, got %v", doc["label"])
	}
}

func TestAllDocKinds(t *testing.T) {
	reset()

	mt := &mockT{name: "TestAllDocs"}
	s := Init(mt, "all doc kinds")
	s.Given("a step")
	s.Note("a note")
	s.Tag("tag1", "tag2")
	s.Kv("key", "val")
	s.Code("snippet", "x := 1", "go")
	s.Table("t", []string{"a"}, [][]string{{"1"}})
	s.Link("link", "https://example.com")
	s.Section("sec", "# Hello")
	s.Mermaid("graph TD; A-->B", "diagram")
	s.Screenshot("/path/to/img.png", "alt text")
	s.Html(HtmlOptions{Content: "<h1>Report</h1>", Title: "Coverage"})
	s.Custom("myType", map[string]string{"foo": "bar"})

	if len(s.steps[0].Docs) != 11 {
		t.Fatalf("expected 11 docs, got %d", len(s.steps[0].Docs))
	}

	expectedKinds := []string{"note", "tag", "kv", "code", "table", "link", "section", "mermaid", "screenshot", "html", "custom"}
	for i, kind := range expectedKinds {
		if s.steps[0].Docs[i]["kind"] != kind {
			t.Errorf("doc %d: expected kind=%s, got %v", i, kind, s.steps[0].Docs[i]["kind"])
		}
		if s.steps[0].Docs[i]["phase"] != "runtime" {
			t.Errorf("doc %d: expected phase=runtime, got %v", i, s.steps[0].Docs[i]["phase"])
		}
	}
}

func TestHtmlDoc(t *testing.T) {
	reset()

	mt := &mockT{name: "TestHtml"}
	s := Init(mt, "html doc")
	s.Given("a step")

	entry := s.Html(HtmlOptions{Path: "./coverage/index.html", Title: "Coverage", Height: 600})
	if entry["kind"] != "html" {
		t.Errorf("expected kind=html, got %v", entry["kind"])
	}
	if entry["path"] != "./coverage/index.html" {
		t.Errorf("expected path set, got %v", entry["path"])
	}
	if entry["height"] != 600 {
		t.Errorf("expected height=600, got %v", entry["height"])
	}
	// url/content must be absent when path is the chosen source.
	if _, ok := entry["url"]; ok {
		t.Error("expected url to be absent")
	}
	if _, ok := entry["content"]; ok {
		t.Error("expected content to be absent")
	}
}

func TestHtmlDocRequiresExactlyOneSource(t *testing.T) {
	cases := []struct {
		name string
		opts HtmlOptions
	}{
		{"none", HtmlOptions{Title: "x"}},
		{"two", HtmlOptions{Path: "a.html", URL: "https://x.test"}},
		{"three", HtmlOptions{Path: "a.html", URL: "https://x.test", Content: "<p>x</p>"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("expected panic for %s source(s)", tc.name)
				}
			}()
			_ = HtmlEntry(tc.opts)
		})
	}
}

func TestSourceOrder(t *testing.T) {
	reset()

	mt1 := &mockT{name: "Test1"}
	mt2 := &mockT{name: "Test2"}

	s1 := Init(mt1, "first")
	s2 := Init(mt2, "second")

	if s1.sourceOrder != 0 {
		t.Errorf("expected first sourceOrder=0, got %d", s1.sourceOrder)
	}
	if s2.sourceOrder != 1 {
		t.Errorf("expected second sourceOrder=1, got %d", s2.sourceOrder)
	}
}

func TestFnCreatesWrappedStep(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFn"}
	s := Init(mt, "fn test")

	called := false
	s.Fn("Given", "a wrapped precondition", func() {
		called = true
	})

	if !called {
		t.Fatal("expected body to be called")
	}
	if len(s.steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(s.steps))
	}
	if s.steps[0].Keyword != "Given" {
		t.Errorf("expected keyword=Given, got %q", s.steps[0].Keyword)
	}
	if s.steps[0].Text != "a wrapped precondition" {
		t.Errorf("expected text %q, got %q", "a wrapped precondition", s.steps[0].Text)
	}
	if !s.steps[0].Wrapped {
		t.Error("expected Wrapped=true")
	}
	if s.steps[0].DurationMs == nil {
		t.Fatal("expected durationMs to be set")
	}
}

func TestFnRecordsDuration(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFnDuration"}
	s := Init(mt, "fn duration")

	s.Fn("When", "I wait briefly", func() {
		// just a small operation
		_ = 1 + 1
	})

	if s.steps[0].DurationMs == nil {
		t.Fatal("expected durationMs to be set")
	}
	if *s.steps[0].DurationMs < 0 {
		t.Errorf("expected non-negative durationMs, got %f", *s.steps[0].DurationMs)
	}
}

func TestFnPropagatesPanics(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFnPanic"}
	s := Init(mt, "fn panic")

	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic to propagate")
		}
		if r != "boom" {
			t.Fatalf("expected panic value 'boom', got %v", r)
		}
		// Duration should still be recorded
		if s.steps[0].DurationMs == nil {
			t.Fatal("expected durationMs to be set even after panic")
		}
	}()

	s.Fn("Then", "it should panic", func() {
		panic("boom")
	})

	t.Fatal("should not reach here")
}

func TestFnAutoAndConversion(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFnAutoAnd"}
	s := Init(mt, "fn auto-and")

	s.Given("a text-only step")
	s.Fn("Given", "a wrapped step", func() {})

	if s.steps[0].Keyword != "Given" {
		t.Errorf("expected first keyword=Given, got %q", s.steps[0].Keyword)
	}
	if s.steps[1].Keyword != "And" {
		t.Errorf("expected second keyword=And (auto-converted), got %q", s.steps[1].Keyword)
	}
	if !s.steps[1].Wrapped {
		t.Error("expected second step to have Wrapped=true")
	}
}

func TestFnChaining(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFnChaining"}
	s := Init(mt, "fn chaining")

	result := s.Fn("Given", "first", func() {}).
		Fn("When", "second", func() {}).
		Fn("Then", "third", func() {})

	if result != s {
		t.Fatal("expected Fn to return the same *S for chaining")
	}
	if len(s.steps) != 3 {
		t.Fatalf("expected 3 steps, got %d", len(s.steps))
	}
	for _, step := range s.steps {
		if !step.Wrapped {
			t.Errorf("expected step %q to have Wrapped=true", step.Text)
		}
	}
}

func TestExpectCreatesWrappedThenStep(t *testing.T) {
	reset()

	mt := &mockT{name: "TestExpect"}
	s := Init(mt, "expect test")

	called := false
	s.Expect("the result is correct", func() {
		called = true
	})

	if !called {
		t.Fatal("expected body to be called")
	}
	if len(s.steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(s.steps))
	}
	if s.steps[0].Keyword != "Then" {
		t.Errorf("expected keyword=Then, got %q", s.steps[0].Keyword)
	}
	if s.steps[0].Text != "the result is correct" {
		t.Errorf("expected text %q, got %q", "the result is correct", s.steps[0].Text)
	}
	if !s.steps[0].Wrapped {
		t.Error("expected Wrapped=true")
	}
	if s.steps[0].DurationMs == nil {
		t.Fatal("expected durationMs to be set")
	}
}

func TestExpectPropagatesPanics(t *testing.T) {
	reset()

	mt := &mockT{name: "TestExpectPanic"}
	s := Init(mt, "expect panic")

	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic to propagate")
		}
		if s.steps[0].DurationMs == nil {
			t.Fatal("expected durationMs to be set even after panic")
		}
	}()

	s.Expect("it should fail", func() {
		panic("assertion failed")
	})

	t.Fatal("should not reach here")
}

func TestFnIntegrationWithMarkers(t *testing.T) {
	reset()

	mt := &mockT{name: "TestFnIntegration"}
	s := Init(mt, "fn + markers")

	s.Given("a text-only precondition").
		Fn("When", "I perform action", func() {}).
		Then("a text-only assertion").
		Expect("the wrapped assertion", func() {})

	if len(s.steps) != 4 {
		t.Fatalf("expected 4 steps, got %d", len(s.steps))
	}

	// Text-only steps should NOT be wrapped
	if s.steps[0].Wrapped {
		t.Error("expected step 0 (Given text) to NOT be wrapped")
	}
	if s.steps[2].Wrapped {
		t.Error("expected step 2 (Then text) to NOT be wrapped")
	}

	// Fn/Expect steps SHOULD be wrapped
	if !s.steps[1].Wrapped {
		t.Error("expected step 1 (Fn When) to be wrapped")
	}
	if !s.steps[3].Wrapped {
		t.Error("expected step 3 (Expect Then) to be wrapped")
	}
}

func TestStartTimerEndTimer(t *testing.T) {
	reset()

	mt := &mockT{name: "TestTimer"}
	s := Init(mt, "timer test")

	s.Given("a step to time")
	token := s.StartTimer()
	time.Sleep(15 * time.Millisecond)
	s.EndTimer(token)

	if s.steps[0].DurationMs == nil {
		t.Fatal("expected DurationMs to be set on the step")
	}
	if *s.steps[0].DurationMs < 10 {
		t.Errorf("expected DurationMs >= 10, got %f", *s.steps[0].DurationMs)
	}
}

func TestEndTimerDoubleEndIsNoop(t *testing.T) {
	reset()

	mt := &mockT{name: "TestDoubleEnd"}
	s := Init(mt, "double end timer")

	s.Given("a step")
	token := s.StartTimer()
	time.Sleep(15 * time.Millisecond)
	s.EndTimer(token)

	first := *s.steps[0].DurationMs

	// Second end should be a no-op
	time.Sleep(10 * time.Millisecond)
	s.EndTimer(token)

	if *s.steps[0].DurationMs != first {
		t.Errorf("expected DurationMs to remain %f after double-end, got %f", first, *s.steps[0].DurationMs)
	}
}

func TestEndTimerInvalidTokenIsNoop(t *testing.T) {
	reset()

	mt := &mockT{name: "TestInvalidToken"}
	s := Init(mt, "invalid token")

	s.Given("a step")
	// Should not panic with an invalid token
	s.EndTimer(999)

	if s.steps[0].DurationMs != nil {
		t.Error("expected DurationMs to remain nil for invalid token")
	}
}

func TestTitlePathSplitsSubtests(t *testing.T) {
	reset()

	mt := &mockT{name: "TestParent/SubTest"}
	Init(mt, "subtest scenario")
	mt.runCleanups()

	cases := getAll()
	if len(cases) != 1 {
		t.Fatalf("expected 1 collected case, got %d", len(cases))
	}

	expected := []string{"TestParent", "SubTest"}
	if len(cases[0].TitlePath) != len(expected) {
		t.Fatalf("expected titlePath %v, got %v", expected, cases[0].TitlePath)
	}
	for i, part := range expected {
		if cases[0].TitlePath[i] != part {
			t.Fatalf("expected titlePath %v, got %v", expected, cases[0].TitlePath)
		}
	}
}

func TestDocEntryWithChildren(t *testing.T) {
	reset()

	mt := &mockT{name: "TestDocChildren"}
	s := Init(mt, "doc with children")

	child1 := NoteEntry("child note 1")
	child2 := KvEntry("child-key", "child-value")
	s.Note("parent note", child1, child2)

	if len(s.docs) != 1 {
		t.Fatalf("expected 1 story-level doc, got %d", len(s.docs))
	}

	parent := s.docs[0]
	if parent["kind"] != "note" {
		t.Errorf("expected kind=note, got %v", parent["kind"])
	}
	if parent["text"] != "parent note" {
		t.Errorf("expected text='parent note', got %v", parent["text"])
	}

	children, ok := parent["children"].([]DocEntry)
	if !ok {
		t.Fatalf("expected children to be []DocEntry, got %T", parent["children"])
	}
	if len(children) != 2 {
		t.Fatalf("expected 2 children, got %d", len(children))
	}
	if children[0]["kind"] != "note" || children[0]["text"] != "child note 1" {
		t.Errorf("unexpected child 0: %v", children[0])
	}
	if children[1]["kind"] != "kv" || children[1]["label"] != "child-key" {
		t.Errorf("unexpected child 1: %v", children[1])
	}
}

func TestDocEntryWithoutChildrenHasNoKey(t *testing.T) {
	reset()

	mt := &mockT{name: "TestNoChildren"}
	s := Init(mt, "no children")

	s.Note("simple note")

	if _, hasChildren := s.docs[0]["children"]; hasChildren {
		t.Error("expected no 'children' key when no children provided")
	}
}

func TestDocChildrenReparentAcrossSteps(t *testing.T) {
	reset()

	mt := &mockT{name: "TestReparentAcrossSteps"}
	s := Init(mt, "reparent across steps")

	s.Given("first step")
	child := s.Note("shared child")
	s.When("second step")
	parent := s.Note("parent note", child)

	if len(s.steps[0].Docs) != 0 {
		t.Fatalf("expected first step docs to be empty after reparenting, got %v", s.steps[0].Docs)
	}
	if len(s.steps[1].Docs) != 1 {
		t.Fatalf("expected second step docs to contain only parent, got %v", s.steps[1].Docs)
	}
	if s.steps[1].Docs[0]["text"] != parent["text"] {
		t.Fatalf("expected second step doc to be parent, got %v", s.steps[1].Docs[0])
	}
}

func TestDocMethodReturnsDocEntry(t *testing.T) {
	reset()

	mt := &mockT{name: "TestReturn"}
	s := Init(mt, "return doc entry")

	entry := s.Note("returned note")
	if entry["kind"] != "note" {
		t.Errorf("expected kind=note, got %v", entry["kind"])
	}
	if entry["text"] != "returned note" {
		t.Errorf("expected text='returned note', got %v", entry["text"])
	}

	// Verify it was also added to the story docs
	if len(s.docs) != 1 {
		t.Fatalf("expected 1 doc, got %d", len(s.docs))
	}
}

func TestDocEntryChildrenSerializeInJSON(t *testing.T) {
	reset()

	child := NoteEntry("inner")
	parent := KvEntry("key", "value", child)

	b, err := json.Marshal(parent)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(b, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	children, ok := parsed["children"].([]any)
	if !ok {
		t.Fatalf("expected children array in JSON, got %T", parsed["children"])
	}
	if len(children) != 1 {
		t.Fatalf("expected 1 child in JSON, got %d", len(children))
	}

	childMap, ok := children[0].(map[string]any)
	if !ok {
		t.Fatalf("expected child to be object, got %T", children[0])
	}
	if childMap["kind"] != "note" {
		t.Errorf("expected child kind=note, got %v", childMap["kind"])
	}
}

func TestTicketObjectsSerialize(t *testing.T) {
	reset()

	mt := &mockT{name: "TestTicketJSON"}
	s := Init(mt, "ticket objects",
		WithTicket("JIRA-100"),
		WithTicketURL("JIRA-200", "https://jira.example.com/JIRA-200"),
	)

	if len(s.tickets) != 2 {
		t.Fatalf("expected 2 tickets, got %d", len(s.tickets))
	}

	// First ticket: string-only
	if s.tickets[0].ID != "JIRA-100" {
		t.Errorf("expected ID=JIRA-100, got %q", s.tickets[0].ID)
	}
	if s.tickets[0].URL != "" {
		t.Errorf("expected empty URL, got %q", s.tickets[0].URL)
	}

	// Second ticket: with URL
	if s.tickets[1].ID != "JIRA-200" {
		t.Errorf("expected ID=JIRA-200, got %q", s.tickets[1].ID)
	}
	if s.tickets[1].URL != "https://jira.example.com/JIRA-200" {
		t.Errorf("expected URL, got %q", s.tickets[1].URL)
	}

	// Verify JSON serialization
	mt.runCleanups()
	cases := getAll()
	b, err := json.Marshal(cases[0].Story.Tickets)
	if err != nil {
		t.Fatalf("failed to marshal tickets: %v", err)
	}

	var tickets []map[string]any
	if err := json.Unmarshal(b, &tickets); err != nil {
		t.Fatalf("failed to unmarshal tickets: %v", err)
	}

	if tickets[0]["id"] != "JIRA-100" {
		t.Errorf("expected id=JIRA-100 in JSON, got %v", tickets[0]["id"])
	}
	if _, hasURL := tickets[0]["url"]; hasURL {
		t.Error("expected no 'url' key for ticket without URL")
	}
	if tickets[1]["id"] != "JIRA-200" {
		t.Errorf("expected id=JIRA-200 in JSON, got %v", tickets[1]["id"])
	}
	if tickets[1]["url"] != "https://jira.example.com/JIRA-200" {
		t.Errorf("expected url in JSON, got %v", tickets[1]["url"])
	}
}

func TestWithTicketURLOption(t *testing.T) {
	reset()

	mt := &mockT{name: "TestTicketURL"}
	s := Init(mt, "ticket url option",
		WithTicketURL("BUG-42", "https://bugs.example.com/42"),
	)

	if len(s.tickets) != 1 {
		t.Fatalf("expected 1 ticket, got %d", len(s.tickets))
	}
	if s.tickets[0].ID != "BUG-42" {
		t.Errorf("expected ID=BUG-42, got %q", s.tickets[0].ID)
	}
	if s.tickets[0].URL != "https://bugs.example.com/42" {
		t.Errorf("expected URL, got %q", s.tickets[0].URL)
	}
}

func TestExportedFactoryFunctions(t *testing.T) {
	// Verify that exported factory functions create correct entries
	// without pushing to any story
	note := NoteEntry("standalone")
	if note["kind"] != "note" || note["text"] != "standalone" {
		t.Errorf("unexpected NoteEntry: %v", note)
	}

	kv := KvEntry("k", "v")
	if kv["kind"] != "kv" || kv["label"] != "k" {
		t.Errorf("unexpected KvEntry: %v", kv)
	}

	code := CodeEntry("label", "content", "go")
	if code["kind"] != "code" || code["lang"] != "go" {
		t.Errorf("unexpected CodeEntry: %v", code)
	}

	link := LinkEntry("label", "https://example.com")
	if link["kind"] != "link" || link["url"] != "https://example.com" {
		t.Errorf("unexpected LinkEntry: %v", link)
	}

	section := SectionEntry("title", "# md")
	if section["kind"] != "section" || section["title"] != "title" {
		t.Errorf("unexpected SectionEntry: %v", section)
	}

	tbl := TableEntry("tbl", []string{"a"}, [][]string{{"1"}})
	if tbl["kind"] != "table" {
		t.Errorf("unexpected TableEntry: %v", tbl)
	}

	mermaid := MermaidEntry("graph TD", "title")
	if mermaid["kind"] != "mermaid" || mermaid["title"] != "title" {
		t.Errorf("unexpected MermaidEntry: %v", mermaid)
	}

	ss := ScreenshotEntry("/path", "alt")
	if ss["kind"] != "screenshot" || ss["alt"] != "alt" {
		t.Errorf("unexpected ScreenshotEntry: %v", ss)
	}

	custom := CustomEntry("myType", "data")
	if custom["kind"] != "custom" || custom["type"] != "myType" {
		t.Errorf("unexpected CustomEntry: %v", custom)
	}

	jsonDoc := JSONEntry("label", map[string]string{"a": "b"})
	if jsonDoc["kind"] != "code" || jsonDoc["lang"] != "json" {
		t.Errorf("unexpected JSONEntry: %v", jsonDoc)
	}

	tag := TagEntry("t1", "t2")
	if tag["kind"] != "tag" {
		t.Errorf("unexpected TagEntry: %v", tag)
	}
}
