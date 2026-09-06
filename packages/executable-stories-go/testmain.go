package es

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"runtime/debug"
	"strings"
	"testing"
	"time"
)

// reporting is true once RunAndReport is driving the suite. Init warns when it
// is not, because the alternative is a suite that collects every story and
// writes nothing with no clue why.
var reporting bool

// gitSha is the commit the report describes. CI environments hand it over
// directly; elsewhere git does.
func gitSha() string {
	for _, key := range []string{"GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"} {
		if sha := os.Getenv(key); sha != "" {
			return sha
		}
	}
	// git resolves HEAD and packed-refs correctly; reimplementing that here
	// would buy nothing.
	out, err := exec.Command("git", "rev-parse", "HEAD").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// packageVersion is the version of the module under test, when it has one. A
// module built from a working tree reports "(devel)", which says nothing.
func packageVersion() string {
	info, ok := debug.ReadBuildInfo()
	if !ok || info.Main.Version == "" || info.Main.Version == "(devel)" {
		return ""
	}
	return info.Main.Version
}

// buildRun assembles the report from whatever the suite collected.
func buildRun() RawRun {
	startMs := float64(startTime.UnixMilli())
	finishMs := float64(finishTime.UnixMilli())

	cwd, _ := os.Getwd()
	return RawRun{
		Schema:         SchemaURL,
		SchemaVersion:  1,
		TestCases:      getAll(),
		Features:       getFeatures(),
		ProjectRoot:    cwd,
		StartedAtMs:    &startMs,
		FinishedAtMs:   &finishMs,
		PackageVersion: packageVersion(),
		GitSha:         gitSha(),
		CI:             detectCI(),
		RunScope:       runScope(),
	}
}

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
	reporting = true
	startTime = time.Now()
	code := m.Run()
	finishTime = time.Now()

	if len(getAll()) > 0 {
		outputPath := os.Getenv("EXECUTABLE_STORIES_OUTPUT")
		if outputPath == "" {
			outputPath = ".executable-stories/raw-run.json"
		}

		run := buildRun()
		if err := writeRawRun(run, outputPath); err != nil {
			// Silence here loses the whole run: an unserializable value in a
			// doc entry fails the marshal and the report never appears.
			fmt.Fprintf(os.Stderr, "executable-stories: could not write %s: %v\n", outputPath, err)
		} else {
			printNextStep(outputPath)
		}
	}

	os.Exit(code)
}
