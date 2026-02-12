package es

import (
	"encoding/json"
	"testing"
)

// mockT implements TestingT for unit testing.
type mockT struct {
	name     string
	failed   bool
	skipped  bool
	cleanups []func()
}

func (m *mockT) Name() string    { return m.name }
func (m *mockT) Failed() bool    { return m.failed }
func (m *mockT) Skipped() bool   { return m.skipped }
func (m *mockT) Helper()         {}
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
	if len(s.tickets) != 2 || s.tickets[0] != "JIRA-123" || s.tickets[1] != "JIRA-456" {
		t.Errorf("unexpected tickets: %v", s.tickets)
	}
	if s.meta["priority"] != "high" {
		t.Errorf("unexpected meta: %v", s.meta)
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
	s.Custom("myType", map[string]string{"foo": "bar"})

	if len(s.steps[0].Docs) != 10 {
		t.Fatalf("expected 10 docs, got %d", len(s.steps[0].Docs))
	}

	expectedKinds := []string{"note", "tag", "kv", "code", "table", "link", "section", "mermaid", "screenshot", "custom"}
	for i, kind := range expectedKinds {
		if s.steps[0].Docs[i]["kind"] != kind {
			t.Errorf("doc %d: expected kind=%s, got %v", i, kind, s.steps[0].Docs[i]["kind"])
		}
		if s.steps[0].Docs[i]["phase"] != "runtime" {
			t.Errorf("doc %d: expected phase=runtime, got %v", i, s.steps[0].Docs[i]["phase"])
		}
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
