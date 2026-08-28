package es

import "testing"

// A run narrowed with `go test -run` reports only the matching tests, so it is
// not the complete contents of the packages it touches. Consumers use the scope
// to decide whether a run may retire scenarios it no longer reports.
func TestRunScopeIsObservedFromTheFlag(t *testing.T) {
	// The testing package registers -run for this very binary, so the scope is
	// something the adapter reads rather than assumes.
	if got := runScope(); got != "full" && got != "filtered" {
		t.Errorf("runScope() = %q, want a definite scope", got)
	}
}

func TestNameFilterDetection(t *testing.T) {
	cases := []struct {
		name    string
		testRun string
		want    bool
	}{
		{"no -run flag", "", false},
		{"go test -run TestPayment", "TestPayment", true},
		// `go test -run .` and `-run .*` match everything, so they narrow nothing.
		{"match-everything dot", ".", false},
		{"match-everything regex", ".*", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isNameFiltered(tc.testRun); got != tc.want {
				t.Errorf("isNameFiltered(%q) = %v, want %v", tc.testRun, got, tc.want)
			}
		})
	}
}
