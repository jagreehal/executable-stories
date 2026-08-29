package es

import (
	"flag"
	"os"
	"testing"
	"time"
)

// isNameFiltered reports whether a -run pattern actually narrows the suite.
//
// The flag is absent on an ordinary run, and the patterns that match everything
// narrow nothing, so neither should mark the run as partial.
func isNameFiltered(testRun string) bool {
	return testRun != "" && testRun != "." && testRun != ".*"
}

// runScope reports how much of each file this run covered.
//
// Returns "" (unknown) when the testing flags are not registered, so a consumer
// keeps what the run did not report rather than retiring it on a guess. When the
// flag is there the answer is observed either way, never assumed.
func runScope() string {
	f := flag.Lookup("test.run")
	if f == nil {
		return ""
	}
	if isNameFiltered(f.Value.String()) {
		return "filtered"
	}
	return "full"
}

// RunAndReport runs the test suite and writes the RawRun JSON.
// Call from TestMain:
//
//	func TestMain(m *testing.M) { es.RunAndReport(m) }
func RunAndReport(m *testing.M) {
	startTime = time.Now()
	code := m.Run()
	finishTime := time.Now()

	cases := getAll()
	if len(cases) > 0 {
		outputPath := os.Getenv("EXECUTABLE_STORIES_OUTPUT")
		if outputPath == "" {
			outputPath = ".executable-stories/raw-run.json"
		}

		startMs := float64(startTime.UnixMilli())
		finishMs := float64(finishTime.UnixMilli())

		cwd, _ := os.Getwd()
		run := RawRun{
			Schema:        SchemaURL,
			SchemaVersion: 1,
			TestCases:     cases,
			Features:      getFeatures(),
			ProjectRoot:   cwd,
			StartedAtMs:   &startMs,
			FinishedAtMs:  &finishMs,
			CI:            detectCI(),
			RunScope:      runScope(),
		}
		if err := writeRawRun(run, outputPath); err == nil {
			printNextStep(outputPath)
		}
	}

	os.Exit(code)
}
