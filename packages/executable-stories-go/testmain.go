package es

import (
	"os"
	"testing"
	"time"
)

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
			SchemaVersion: 1,
			TestCases:     cases,
			ProjectRoot:   cwd,
			StartedAtMs:   &startMs,
			FinishedAtMs:  &finishMs,
			CI:            detectCI(),
		}
		_ = writeRawRun(run, outputPath)
	}

	os.Exit(code)
}
