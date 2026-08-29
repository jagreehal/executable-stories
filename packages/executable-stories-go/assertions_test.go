package es

import "testing"

// Go has no assertion counter to read, so a step's count is only known when the
// author routes the claim through a wrapped body. Steps written as bare markers
// stay unobserved: absent is honest, zero would be an accusation.

func TestExpectRecordsAnAssertion(t *testing.T) {
	reset()

	s := Init(&mockT{name: "TestExpect"}, "a checked claim")
	s.Given("two numbers 5 and 3")
	s.Expect("the result is 8", func() {
		if 5+3 != 8 {
			t.Error("arithmetic is broken")
		}
	})

	if len(s.steps) != 2 {
		t.Fatalf("expected 2 steps, got %d", len(s.steps))
	}
	if s.steps[1].Assertions == nil {
		t.Fatal("expected the wrapped claim to record an assertion")
	}
	if *s.steps[1].Assertions != 1 {
		t.Errorf("expected 1 assertion, got %d", *s.steps[1].Assertions)
	}
}

func TestMarkerStepsStayUnobserved(t *testing.T) {
	reset()

	s := Init(&mockT{name: "TestMarker"}, "an unwrapped claim")
	s.Given("two numbers 5 and 3")
	s.Then("the result is 8")

	for i, step := range s.steps {
		if step.Assertions != nil {
			t.Errorf("step %d: expected no count, got %d", i, *step.Assertions)
		}
	}
}

func TestWrappedSetupDoesNotCountAsAClaim(t *testing.T) {
	reset()

	s := Init(&mockT{name: "TestSetup"}, "wrapped setup")
	s.Fn("Given", "an expensive fixture", func() {})

	if s.steps[0].Assertions != nil {
		t.Error("a wrapped Given arranges, it does not assert")
	}
}

func TestSecondWrappedClaimStillCounts(t *testing.T) {
	reset()

	// Auto-And rewrites a repeated Then to And before the step is stored. The
	// second claim is still a claim.
	s := Init(&mockT{name: "TestSecondClaim"}, "two claims")
	s.Given("two numbers 5 and 3")
	s.Expect("the result is 8", func() {})
	s.Expect("the result is positive", func() {})

	if s.steps[2].Keyword != "And" {
		t.Fatalf("expected auto-And to rewrite the second Then, got %q", s.steps[2].Keyword)
	}
	if s.steps[2].Assertions == nil {
		t.Fatal("expected the second claim to record an assertion")
	}
}
