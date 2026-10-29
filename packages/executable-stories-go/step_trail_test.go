package es

import "testing"

// logT captures what the adapter logs, so the failure step trail can be read.
type logT struct {
	errT
	logs []string
}

func (l *logT) Log(args ...any) {
	for _, a := range args {
		l.logs = append(l.logs, a.(string))
	}
}

// TestStepTrailOnFailure: a failing story logs its steps, marking where it
// failed, so a red test shows how far it got without opening the report.
func TestStepTrailOnFailure(t *testing.T) {
	cases := []struct {
		name  string
		steps func(s *S, lt *logT)
		want  string
	}{
		{"marker: the last claim failed", func(s *S, lt *logT) {
			s.Given("a balance of 50")
			s.Then("the balance is 150")
			lt.Errorf("150 != 151")
		}, "Story steps:\n  ✓ Given a balance of 50\n  ✗ Then the balance is 150"},
		{"wrapped: the body that failed", func(s *S, lt *logT) {
			s.Fn("Given", "setup", func() {})
			s.Fn("When", "it breaks", func() { lt.Errorf("kaput") })
			s.Then("never checked")
		}, "Story steps:\n  ✓ Given setup\n  ✗ When it breaks\n  ✓ Then never checked"},
		{"a recovered panic does not own a later failure", func(s *S, lt *logT) {
			func() {
				defer func() { _ = recover() }()
				s.Fn("Given", "a rejected input", func() { panic("rejected") })
			}()
			s.Then("the total is 3")
			lt.Errorf("3 != 4")
		}, "Story steps:\n  ✓ Given a rejected input\n  ✗ Then the total is 3"},
		{"nested: the inner step that failed", func(s *S, lt *logT) {
			s.Fn("When", "the order is placed", func() {
				s.Fn("And", "payment is taken", func() { lt.Errorf("declined") })
			})
		}, "Story steps:\n  ✓ When the order is placed\n  ✗ And payment is taken"},
		{"after a finished wrapped step", func(s *S, lt *logT) {
			s.Fn("Given", "setup", func() {})
			lt.Errorf("later")
		}, "Story steps:\n  ✓ Given setup\n  ✗ (failed after the last step)"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			reset()
			lt := &logT{errT: errT{mockT: mockT{name: "TestTrail"}}}
			s := Init(lt, "trail")
			c.steps(s, lt)
			lt.runCleanups()
			if len(lt.logs) != 1 || lt.logs[0] != c.want {
				t.Fatalf("got %q, want %q", lt.logs, c.want)
			}
		})
	}
}

// TestStepTrailNotLoggedOnPass: a passing story stays quiet.
func TestStepTrailNotLoggedOnPass(t *testing.T) {
	reset()
	lt := &logT{errT: errT{mockT: mockT{name: "TestQuiet"}}}
	s := Init(lt, "quiet")
	s.Given("a precondition")
	lt.runCleanups()
	if len(lt.logs) != 0 {
		t.Fatalf("expected no log on pass, got %q", lt.logs)
	}
}
