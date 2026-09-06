package es

import "testing"

// errT records what the adapter reported so a failing check can be observed
// without failing this test.
type errT struct {
	mockT
	errors []string
}

func (e *errT) Errorf(format string, args ...any) {
	e.errors = append(e.errors, format)
	e.failed = true
}

// TestCheckCountsAgainstTheOpenStep: assertions belong to the step that was
// open when they ran, the way vitest attributes its assertion counter.
func TestCheckCountsAgainstTheOpenStep(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestCounts"}}
	s := Init(mt, "counting")

	s.Given("a precondition")
	s.Check(true, "the precondition holds")

	s.Then("two things are true")
	s.Check(true, "first")
	s.Check(true, "second")

	mt.runCleanups()

	if got := s.steps[0].Assertions; got == nil || *got != 1 {
		t.Fatalf("expected 1 assertion on the Given, got %v", got)
	}
	if got := s.steps[1].Assertions; got == nil || *got != 2 {
		t.Fatalf("expected 2 assertions on the Then, got %v", got)
	}
}

// TestUncheckedStepStaysUnobserved: nil is not zero. A step nobody checked
// must not be reported as a step that asserted nothing.
func TestUncheckedStepStaysUnobserved(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestUnobserved"}}
	s := Init(mt, "unobserved")

	s.Then("a claim nobody wired an assertion to")
	mt.runCleanups()

	if got := s.steps[0].Assertions; got != nil {
		t.Fatalf("expected the step unobserved, got %d", *got)
	}
}

// TestFinalStepIsFlushedAtTestEnd: the last marker's count is only known once
// the test is over.
func TestFinalStepIsFlushedAtTestEnd(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestFlush"}}
	s := Init(mt, "flush")

	s.Then("the last claim")
	s.Check(true, "checked after the last marker")

	if s.steps[0].Assertions != nil {
		t.Fatal("expected the count to be open until the test ends")
	}
	mt.runCleanups()

	if got := s.steps[0].Assertions; got == nil || *got != 1 {
		t.Fatalf("expected 1 assertion after the flush, got %v", got)
	}
}

// TestFailingCheckReportsAndReturns: a false check fails the test and says so,
// and hands the result back so the caller can bail out.
func TestFailingCheckReportsAndReturns(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestFailing"}}
	s := Init(mt, "failing")

	s.Then("something that is not true")
	if s.Check(1 == 2, "expected %d, got %d", 2, 1) {
		t.Fatal("expected Check to return false")
	}
	if len(mt.errors) != 1 {
		t.Fatalf("expected the failure reported once, got %d", len(mt.errors))
	}

	mt.runCleanups()
	if got := s.steps[0].Assertions; got == nil || *got != 1 {
		t.Fatalf("a failed check is still an assertion, got %v", got)
	}
}

// TestExpectReportsWhatItActuallyChecked: a wrapped claim that checks three
// things should say three, not one.
func TestExpectReportsWhatItActuallyChecked(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestExpectCount"}}
	s := Init(mt, "wrapped count")

	s.Expect("the totals line up", func() {
		s.Check(true, "one")
		s.Check(true, "two")
		s.Check(true, "three")
	})
	mt.runCleanups()

	if got := s.steps[0].Assertions; got == nil || *got != 3 {
		t.Fatalf("expected 3 assertions, got %v", got)
	}
}

// TestExpectWithoutChecksStillEvidencesOne: wrapping a claim is itself the
// evidence Go can give, so the existing behaviour has to survive.
func TestExpectWithoutChecksStillEvidencesOne(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestExpectPlain"}}
	s := Init(mt, "wrapped plain")

	s.Expect("the totals line up", func() {})
	mt.runCleanups()

	if got := s.steps[0].Assertions; got == nil || *got != 1 {
		t.Fatalf("expected the wrapped claim to still evidence 1, got %v", got)
	}
}

// TestChecksAfterAWrappedStepDoNotLandOnIt: a wrapped step measures its own
// body and closes; later checks belong to whatever comes next.
func TestChecksAfterAWrappedStepDoNotLandOnIt(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestAfterWrapped"}}
	s := Init(mt, "after wrapped")

	s.Expect("a wrapped claim", func() { s.Check(true, "inside") })
	s.Check(true, "outside, belonging to no step")
	mt.runCleanups()

	if got := s.steps[0].Assertions; got == nil || *got != 1 {
		t.Fatalf("expected the wrapped step to keep its own count, got %v", got)
	}
}

// TestCheckBeforeAnyStep: counting outside a step is harmless.
func TestCheckBeforeAnyStep(t *testing.T) {
	reset()
	mt := &errT{mockT: mockT{name: "TestNoStep"}}
	s := Init(mt, "no step")

	s.Check(true, "before any step")
	s.Given("a step that follows")
	mt.runCleanups()

	if got := s.steps[0].Assertions; got != nil {
		t.Fatalf("expected the following step unobserved, got %d", *got)
	}
}
