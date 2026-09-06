package es

import (
	"encoding/json"
	"regexp"
	"strings"
	"testing"
)

// --- run provenance -------------------------------------------------------

// TestRunCarriesProvenance: the report says which commit and which version of
// the code under test produced it, the way the vitest reporter does.
func TestRunCarriesProvenance(t *testing.T) {
	reset()
	mt := &mockT{name: "TestProvenance"}
	Init(mt, "a scenario")
	mt.runCleanups()

	run := buildRun()
	if !regexp.MustCompile(`^[0-9a-f]{40}$`).MatchString(run.GitSha) {
		t.Fatalf("expected a git sha for this checkout, got %q", run.GitSha)
	}
	if run.ProjectRoot == "" {
		t.Fatal("expected a project root")
	}
}

func TestGitShaPrefersTheCIEnvironment(t *testing.T) {
	t.Setenv("GITHUB_SHA", "deadbeef")
	if got := gitSha(); got != "deadbeef" {
		t.Fatalf("expected the CI sha, got %q", got)
	}
}

// --- one bad value must not cost the whole report -------------------------

// TestUnserializableDocValueDoesNotLoseTheRun: a channel in a kv entry used to
// fail the run's marshal, and the entire report was lost.
func TestUnserializableDocValueDoesNotLoseTheRun(t *testing.T) {
	reset()
	var warned bool
	orig := warn
	warn = func(format string, args ...any) { warned = true }
	defer func() { warn = orig }()

	mt := &mockT{name: "TestBadValue"}
	s := Init(mt, "a scenario with an unserializable value")
	s.Given("a step")
	s.Kv("connection", make(chan int))
	mt.runCleanups()

	if !warned {
		t.Fatal("expected a warning about the unserializable value")
	}
	if _, err := json.Marshal(buildRun()); err != nil {
		t.Fatalf("one bad value cost the whole run: %v", err)
	}

	docs := getAll()[0].Story.Steps[0].Docs
	if len(docs) != 1 {
		t.Fatalf("expected the entry kept, got %d", len(docs))
	}
	if v, _ := docs[0]["value"].(string); !strings.Contains(v, "chan") {
		t.Fatalf("expected the value rendered as text, got %v", docs[0]["value"])
	}
}

func TestSerializableDocValueIsUntouched(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestGoodValue"}, "fine")
	s.Given("a step")
	s.Kv("count", 42)

	if v := s.steps[0].Docs[0]["value"]; v != 42 {
		t.Fatalf("expected the value kept as-is, got %v (%T)", v, v)
	}
}

// --- the missing TestMain -------------------------------------------------

// TestInitWithoutRunAndReportWarns: without TestMain the whole suite runs,
// collects every story and writes nothing, with no clue why.
func TestInitWithoutRunAndReportWarns(t *testing.T) {
	reset()
	reporting = false
	warnedOnce.Store(false)
	var warnings int
	orig := warn
	warn = func(format string, args ...any) { warnings++ }
	defer func() { warn = orig; reporting = true }()

	Init(&mockT{name: "TestNoMain"}, "one")
	Init(&mockT{name: "TestNoMain2"}, "two")

	if warnings != 1 {
		t.Fatalf("expected exactly one warning for the whole suite, got %d", warnings)
	}
}

func TestNoWarningWhenReporting(t *testing.T) {
	reset()
	reporting = true
	warnedOnce.Store(false)
	called := false
	orig := warn
	warn = func(format string, args ...any) { called = true }
	defer func() { warn = orig }()

	Init(&mockT{name: "TestWithMain"}, "one")

	if called {
		t.Fatal("expected no warning when RunAndReport is driving the suite")
	}
}

// --- json doc entries -----------------------------------------------------

func TestJSONEntryWarnsOnUnserializableValue(t *testing.T) {
	called := false
	orig := warn
	warn = func(format string, args ...any) { called = true }
	defer func() { warn = orig }()

	entry := JSONEntry("bad", make(chan int))
	if !called {
		t.Fatal("expected a warning when the value could not be marshalled")
	}
	if entry["lang"] != "json" {
		t.Fatalf("expected the entry still produced, got %v", entry)
	}
}

// TestCheckPanicsWhenItCannotFail: a Check that cannot fail the test must not
// pass quietly — that records evidence in the report for a claim nothing
// enforced. mockT is a TestingT with no Errorf, which is exactly the case.
func TestCheckPanicsWhenItCannotFail(t *testing.T) {
	reset()
	s := Init(&mockT{name: "TestNoReporter"}, "unreportable")
	s.Then("something untrue")

	defer func() {
		if recover() == nil {
			t.Fatal("expected a failing Check against a TestingT with no Errorf to panic")
		}
	}()
	s.Check(false, "expected %d", 1)
}
