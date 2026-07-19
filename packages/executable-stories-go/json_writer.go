package es

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// printNextStep tells the user how to turn the run JSON into a report.
//
// The JS adapters render reports in-process at the end of the run, so their
// users never have to know the CLI exists. Go hands off to the CLI instead, so
// without this the run ends with a file and no indication of what to do with
// it. Written to stderr so it never pollutes piped output; set
// EXECUTABLE_STORIES_QUIET to silence it in CI.
func printNextStep(outputPath string) {
	if os.Getenv("EXECUTABLE_STORIES_QUIET") != "" {
		return
	}
	fmt.Fprintf(os.Stderr, "\nexecutable-stories: wrote %s\n", outputPath)
	fmt.Fprintf(os.Stderr, "  next: executable-stories format %s --format html\n", outputPath)
}

// writeRawRun marshals the RawRun to JSON and writes it to the given file path.
// Parent directories are created automatically.
func writeRawRun(run RawRun, outputPath string) error {
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(run, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(outputPath, data, 0o644)
}
